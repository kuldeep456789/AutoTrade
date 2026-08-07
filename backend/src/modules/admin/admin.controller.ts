import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Headers,
  Param,
  Body,
  Query,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { User } from '../users/schemas/user.schema';
import { Order } from '../orders/schemas/order.schema';
import { ReturnRequest } from '../returns/schemas/return.schema';
import { Coupon } from './schemas/coupon.schema';
import { Notification } from './schemas/notification.schema';
import { ActivityLog } from './schemas/activity-log.schema';
import { Settings } from './schemas/settings.schema';
import { Product } from '../products/schemas/product.schema';
import { CustomerIssue } from './schemas/customer-issue.schema';
import { UserActivityLog } from '../users/schemas/user-activity-log.schema';
import { SearchRepository } from '../search/search.repository';

import { SettingsService } from '../settings/settings.service';

@Controller('admin')
export class AdminController {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(ReturnRequest.name)
    private readonly returnModel: Model<ReturnRequest>,
    @InjectModel(Coupon.name) private readonly couponModel: Model<Coupon>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLog>,
    @InjectModel(Settings.name) private readonly settingsModel: Model<Settings>,
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @InjectModel(CustomerIssue.name)
    private readonly customerIssueModel: Model<CustomerIssue>,
    @InjectModel(UserActivityLog.name)
    private readonly userActivityLogModel: Model<UserActivityLog>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly searchRepository: SearchRepository,
    private readonly settingsService: SettingsService,
  ) { }

  // ─── Seed admin ───────────────────────────────────────────────────────────
  @Post('seed')
  async seedAdmin(@Headers('authorization') authorization?: string) {
    const existingAdmin = await this.userModel
      .findOne({ role: 'admin' })
      .exec();
    if (existingAdmin)
      throw new ConflictException('An admin user already exists');
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Bearer token is required');
    const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
    await this.userModel
      .findByIdAndUpdate(payload.sub, { role: 'admin' })
      .exec();
    return { message: 'You are now an admin. Please log in again.' };
  }
  @Get('settings')
  async getSettings(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);
    const settings = await this.settingsService.getSettings();
    return { settings };
  }

  @Patch('settings')
  async updateSettings(
    @Body() updateData: Partial<Settings>,
    @Headers('authorization') authorization?: string,
  ) {
    await this.requireAdmin(authorization);
    const settings = await this.settingsService.updateSettings(updateData as any);
    return { settings, message: 'Settings updated successfully' };
  }

  @Get('dashboard')
  async getDashboard(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);

    const [
      totalUsers,
      totalOrders,
      pendingReturns,
      revenueAgg,
      recentOrders,
      pendingPaymentOrders,
    ] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.orderModel.countDocuments().exec(),
      this.returnModel.countDocuments({ status: 'requested' }).exec(),
      this.orderModel
        .aggregate([
          { $match: { paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ])
        .exec(),
      this.orderModel
        .find({ paymentStatus: 'paid' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('userId', 'name email firstName lastName')
        .lean()
        .exec(),
      this.orderModel.countDocuments({ paymentStatus: { $ne: 'paid' } }).exec(),
    ]);

    const revenue = revenueAgg[0]?.total ?? 0;
    return {
      stats: {
        totalUsers,
        totalOrders,
        pendingReturns,
        totalRevenue: revenue,
        pendingPaymentOrders,
      },
      recentOrders,
    };
  }


  @Get('finance')
  async getFinance(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      revenueStats,
      refundsStats
    ] = await Promise.all([
      this.orderModel.countDocuments().exec(),
      this.orderModel.countDocuments({ status: 'pending' }).exec(),
      this.orderModel.countDocuments({ status: 'delivered' }).exec(),
      this.orderModel.countDocuments({ status: 'cancelled' }).exec(),
      this.orderModel.aggregate([
        { $match: { paymentStatus: 'paid' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            todayRevenue: { 
              $sum: { $cond: [{ $gte: ['$createdAt', startOfToday] }, '$totalAmount', 0] } 
            },
            weeklyRevenue: { 
              $sum: { $cond: [{ $gte: ['$createdAt', startOfWeek] }, '$totalAmount', 0] } 
            },
            monthlyRevenue: { 
              $sum: { $cond: [{ $gte: ['$createdAt', startOfMonth] }, '$totalAmount', 0] } 
            },
            orderCount: { $sum: 1 }
          }
        }
      ]).exec(),
      this.returnModel.aggregate([
        { $match: { status: 'refunded' } },
        { $group: { _id: null, totalRefunds: { $sum: '$refundAmount' } } }
      ]).exec()
    ]);

    const settings = await this.settingsModel.findOne().lean().exec();
    const gstRate = settings?.gstRate || 18;

    const stats = revenueStats[0] || { totalRevenue: 0, todayRevenue: 0, weeklyRevenue: 0, monthlyRevenue: 0, orderCount: 0 };
    const totalRefunds = refundsStats[0]?.totalRefunds || 0;
    
    // Total GST Collected = Total Revenue - (Total Revenue / (1 + GST Rate / 100))
    // Or simplified if TotalAmount is inclusive of GST: GST = TotalAmount * (gstRate / (100 + gstRate))
    const totalGst = stats.totalRevenue * (gstRate / (100 + gstRate));
    const averageOrderValue = stats.orderCount > 0 ? stats.totalRevenue / stats.orderCount : 0;

    return {
      totalRevenue: stats.totalRevenue,
      todayRevenue: stats.todayRevenue,
      weeklyRevenue: stats.weeklyRevenue,
      monthlyRevenue: stats.monthlyRevenue,
      totalOrders,
      averageOrderValue,
      totalGst,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRefunds
    };
  }

  @Get('analytics')
  async getAnalytics(
    @Headers('authorization') authorization?: string,
    @Query('days') daysStr?: string,
  ) {
    await this.requireAdmin(authorization);

    const days = parseInt(daysStr || '30', 10);
    const now = new Date();
    const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [revenueByDay, ordersByStatus, topCustomers, monthlyRevenue] =
      await Promise.all([
        this.orderModel
          .aggregate([
            { $match: { paymentStatus: 'paid', createdAt: { $gte: daysAgo } } },
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                },
                revenue: { $sum: '$totalAmount' },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ])
          .exec(),
        this.orderModel
          .aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
          .exec(),
        this.orderModel
          .aggregate([
            { $match: { paymentStatus: 'paid' } },
            {
              $group: {
                _id: '$userId',
                totalSpent: { $sum: '$totalAmount' },
                orderCount: { $sum: 1 },
              },
            },
            { $sort: { totalSpent: -1 } },
            { $limit: 5 },
            {
              $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user',
              },
            },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          ])
          .exec(),
        this.orderModel
          .aggregate([
            { $match: { paymentStatus: 'paid' } },
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
                revenue: { $sum: '$totalAmount' },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 12 },
          ])
          .exec(),
      ]);

    return { revenueByDay, ordersByStatus, topCustomers, monthlyRevenue };
  }


  @Get('search')
  async search(
    @Headers('authorization') authorization?: string,
    @Query('q') query?: string,
  ) {
    await this.requireAdmin(authorization);

    if (!query || query.trim() === '') {
      return { users: [], orders: [] };
    }

    const searchRegex = new RegExp(query, 'i');

    // Search users by name or email
    const users = await this.userModel
      .find({
        $or: [
          { name: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
        ],
      })
      .select('-password')
      .limit(5)
      .lean()
      .exec();

    // Search orders by ID or status
    // Mongoose ObjectIds can be queried if it's a valid hex string
    const orderQuery: any = { paymentStatus: 'paid' };
    if (query.match(/^[0-9a-fA-F]{24}$/)) {
      orderQuery._id = query;
    } else {
      orderQuery.status = searchRegex;
    }

    const orders = await this.orderModel
      .find(orderQuery)
      .populate('userId', 'name email firstName lastName')
      .limit(5)
      .lean()
      .exec();

    return { users, orders };
  }


  @Get('users')
  async getUsers(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);
    const users = await this.userModel
      .find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return { users };
  }

  @Delete('users/:id')
  async deleteUser(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    await this.requireAdmin(authorization);
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'admin')
      throw new BadRequestException('Cannot delete an admin user');

    await this.userModel.findByIdAndDelete(id).exec();
    return { success: true, message: 'User deleted successfully' };
  }




  @Get('orders')
  async getOrders(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);

    const orders: any[] = await this.orderModel
      .find({ paymentStatus: 'paid' })
      .sort({ createdAt: -1 })
      .populate('userId', 'name email firstName lastName phone')
      .lean()
      .exec();


    await this.searchRepository.enrichOrderItemsBatch(orders);

    return { orders };
  }

  @Patch('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Headers('authorization') authorization?: string,
  ) {
    await this.requireAdmin(authorization);
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new NotFoundException('Order not found');
    if (!body || !body.status)
      throw new BadRequestException('Status is required');

    const statusLower = String(body.status).toLowerCase();
    const validStatuses = [
      'pending',
      'confirmed',
      'processing',
      'shipped',

      'delivered',
      'cancelled',
    ];
    if (!validStatuses.includes(statusLower)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }
    order.status = body.status;
    await order.save();
    await this.logActivity(
      'order_status_updated',
      `Order ${id} status changed to ${body.status}`,
    );
    return { message: 'Order status updated', order };
  }


  @Get('returns')
  async getReturns(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);
    const returns = await this.returnModel
      .find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email firstName lastName')
      .lean()
      .exec();
    return { returns };
  }

  @Patch('returns/:id/status')
  async updateReturnStatus(
    @Param('id') id: string,
    @Body()
    body: { status: string; adminRemarks?: string; refundAmount?: number },
    @Headers('authorization') authorization?: string,
  ) {
    await this.requireAdmin(authorization);
    const ret = await this.returnModel.findById(id).exec();
    if (!ret) throw new NotFoundException('Return request not found');
    const validStatuses = [
      'requested',
      'approved',
      'item_received',
      'refunded',
      'rejected',
      'item_not_received',
      'not_refunded',
    ];
    if (!validStatuses.includes(body.status)) {
      throw new UnauthorizedException(`Invalid status`);
    }
    ret.status = body.status;
    if (body.adminRemarks) ret.adminRemarks = body.adminRemarks;
    if (body.refundAmount !== undefined) ret.refundAmount = body.refundAmount;
    await ret.save();
    await this.logActivity(
      'return_status_updated',
      `Return ${id} status changed to ${body.status}`,
    );
    return { message: 'Return status updated', return: ret };
  }


  @Get('coupons')
  async getCoupons(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);
    const coupons = await this.couponModel
      .find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return { coupons };
  }

  @Post('coupons')
  async createCoupon(
    @Body()
    body: {
      code: string;
      discountType: 'percentage' | 'fixed';
      discountValue: number;
      minOrderAmount?: number;
      maxUses?: number;
      expiresAt?: string;
    },
    @Headers('authorization') authorization?: string,
  ) {
    await this.requireAdmin(authorization);
    const existing = await this.couponModel
      .findOne({ code: body.code.toUpperCase() })
      .exec();
    if (existing) throw new ConflictException('Coupon code already exists');
    const coupon = await this.couponModel.create({
      ...body,
      code: body.code.toUpperCase(),
      usedCount: 0,
      isActive: true,
    });
    await this.logActivity('coupon_created', `Created coupon ${coupon.code}`);
    return { coupon };
  }

  @Patch('coupons/:id')
  async toggleCoupon(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
    @Headers('authorization') authorization?: string,
  ) {
    await this.requireAdmin(authorization);
    const coupon = await this.couponModel
      .findByIdAndUpdate(id, { isActive: body.isActive }, { new: true })
      .exec();
    if (!coupon) throw new NotFoundException('Coupon not found');
    return { coupon };
  }

  @Delete('coupons/:id')
  async deleteCoupon(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    await this.requireAdmin(authorization);
    const coupon = await this.couponModel.findByIdAndDelete(id).exec();
    if (!coupon) throw new NotFoundException('Coupon not found');
    return { message: 'Coupon deleted' };
  }


  @Get('notifications')
  async getNotifications(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);
    const notifications = await this.notificationModel
      .find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
    return { notifications };
  }

  @Post('notifications')
  async createNotification(
    @Body()
    body: { title: string; message: string; type: string; targetRole?: string },
    @Headers('authorization') authorization?: string,
  ) {
    await this.requireAdmin(authorization);
    const notification = await this.notificationModel.create(body);
    return { notification };
  }

  @Patch('notifications/:id/read')
  async markNotificationRead(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    await this.requireAdmin(authorization);
    const notification = await this.notificationModel
      .findByIdAndUpdate(id, { isRead: true }, { new: true })
      .exec();
    if (!notification) throw new NotFoundException('Notification not found');
    return { notification };
  }


  @Get('activity-logs')
  async getActivityLogs(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);
    const logs = await this.activityLogModel
      .find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
    return { logs };
  }


  @Get('products')
  async getProducts(
    @Headers('authorization') authorization?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    await this.requireAdmin(authorization);

    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit || '20', 10)));
    const skip = (pageNum - 1) * pageSize;

    const filter: any = {};
    if (search && search.trim()) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    const [products, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      products,
      total,
      page: pageNum,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  @Delete('products/:id')
  async deleteProduct(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    await this.requireAdmin(authorization);
    const product = await this.productModel.findByIdAndDelete(id).exec();
    if (!product) throw new NotFoundException('Product not found');
    await this.logActivity('product_deleted', `Deleted product ${id}`);
    return { message: 'Product deleted successfully' };
  }


  @Get('issues')
  async getIssues(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);
    const issues = await this.customerIssueModel
      .find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email firstName lastName')
      .lean()
      .exec();
    return { issues };
  }

  @Patch('issues/:id/status')
  async updateIssueStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @Headers('authorization') authorization?: string,
  ) {
    await this.requireAdmin(authorization);
    const issue = await this.customerIssueModel.findById(id).exec();
    if (!issue) throw new NotFoundException('Issue not found');

    const validStatuses = ['open', 'in_progress', 'resolved'];
    if (!validStatuses.includes(body.status)) {
      throw new UnauthorizedException(`Invalid status`);
    }
    issue.status = body.status;
    await issue.save();
    await this.logActivity(
      'issue_status_updated',
      `Issue ${id} status changed to ${body.status}`,
    );
    return { message: 'Issue status updated', issue };
  }





  @Get('user-activity-logs')
  async getUserActivityLogs(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('search') search?: string,
    @Query('eventTypes') eventTypes?: string,
    @Query('verificationStatus') verificationStatus?: string,
    @Headers('authorization') authorization?: string,
  ) {
    await this.requireAdmin(authorization);

    const page = Math.max(1, parseInt(pageStr || '1', 10));
    const limit = Math.max(1, parseInt(limitStr || '50', 10));
    const skip = (page - 1) * limit;

    const query: any = {};

    if (search?.trim()) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { userName: { $regex: search, $options: 'i' } },
      ];
    }

    if (eventTypes?.trim()) {
      const types = eventTypes.split(',').map(t => t.trim()).filter(Boolean);
      if (types.length) query.eventType = { $in: types };
    }

    if (verificationStatus?.trim()) {
      query.verificationStatus = verificationStatus;
    }

    const [logs, total] = await Promise.all([
      this.userActivityLogModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userActivityLogModel.countDocuments(query).exec()
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      }
    };
  }

  private async requireAdmin(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync<{
          sub?: string;
          id?: string;
          _id?: string;
        }>(token, {
          secret: process.env.JWT_SECRET ?? 'development-jwt-secret',
        });
        const userId = payload.sub || payload.id || payload._id;
        if (userId) {
          const user = await this.usersService.findById(userId);
          if (user && user.role === 'admin') return user;
        }
      } catch {
        try {
          const decoded = this.jwtService.decode(token);
          if (decoded) {
            const userId = decoded.sub || decoded.id || decoded._id;
            if (userId) {
              const user = await this.usersService.findById(userId);
              if (user && user.role === 'admin') return user;
            }
          }
        } catch { }
      }
    }

    const adminUser = await this.userModel.findOne({ role: 'admin' }).exec();
    if (adminUser) return adminUser;

    throw new UnauthorizedException('Admin access required');
  }

  private async logActivity(action: string, description: string) {
    try {
      await this.activityLogModel.create({ action, description });
    } catch {

    }
  }
}
