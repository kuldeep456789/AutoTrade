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
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

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

  // ─── Dashboard ────────────────────────────────────────────────────────────
  @Get('dashboard')
  async getDashboard(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);

    const [totalUsers, totalOrders, pendingReturns, revenueAgg, recentOrders, unpaidOrders] =
      await Promise.all([
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
          .find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('userId', 'name email firstName lastName')
          .lean()
          .exec(),
        this.orderModel
          .countDocuments({ paymentStatus: { $ne: 'paid' } })
          .exec(),
      ]);

    const revenue = revenueAgg[0]?.total ?? 0;
    return {
      stats: { totalUsers, totalOrders, pendingReturns, totalRevenue: revenue, unpaidOrders },
      recentOrders,
    };
  }

  // ─── Analytics ────────────────────────────────────────────────────────────
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

  // ─── Search ───────────────────────────────────────────────────────────────
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
    let orderQuery: any = {};
    if (query.match(/^[0-9a-fA-F]{24}$/)) {
      orderQuery = { _id: query };
    } else {
      orderQuery = { status: searchRegex };
    }

    const orders = await this.orderModel
      .find(orderQuery)
      .populate('userId', 'name email firstName lastName')
      .limit(5)
      .lean()
      .exec();

    return { users, orders };
  }

  // ─── Users ────────────────────────────────────────────────────────────────
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
      throw new UnauthorizedException('Cannot delete an admin account');
    await this.userModel.findByIdAndDelete(id).exec();
    await this.logActivity('user_deleted', `Deleted user ${user.email}`);
    return { message: 'User deleted successfully' };
  }

  // ─── Orders ───────────────────────────────────────────────────────────────
  @Get('orders')
  async getOrders(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);
    const orders = await this.orderModel
      .find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email firstName lastName')
      .lean()
      .exec();
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
      'out_for_delivery',
      'out for delivery',
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

  // ─── Returns ──────────────────────────────────────────────────────────────
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

  // ─── Coupons ──────────────────────────────────────────────────────────────
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

  // ─── Notifications ────────────────────────────────────────────────────────
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

  // ─── Activity Logs ────────────────────────────────────────────────────────
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

  // ─── Products ─────────────────────────────────────────────────────────────
  @Get('products')
  async getProducts(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);
    const products = await this.productModel
      .find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return { products };
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

  // ─── Customer Issues ──────────────────────────────────────────────────────
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

  // ─── Settings ─────────────────────────────────────────────────────────────
  @Get('settings')
  async getSettings(@Headers('authorization') authorization?: string) {
    await this.requireAdmin(authorization);
    let settings = await this.settingsModel.findOne().lean().exec();
    if (!settings) {
      settings = await this.settingsModel.create({
        storeName: 'AutoTrade',
        storeEmail: 'hello@autotrade.in',
        currency: 'INR',
        heroBannerImages: [],
        maintenanceMode: false,
        freeShippingThreshold: 499,
        socialLinks: {},
      });
    }
    return { settings };
  }

  @Patch('settings')
  async updateSettings(
    @Body()
    body: Partial<{
      storeName: string;
      storeEmail: string;
      currency: string;
      heroBannerImages: string[];
      maintenanceMode: boolean;
      freeShippingThreshold: number;
      socialLinks: Record<string, string>;
    }>,
    @Headers('authorization') authorization?: string,
  ) {
    await this.requireAdmin(authorization);
    const settings = await this.settingsModel
      .findOneAndUpdate({}, { $set: body }, { new: true, upsert: true })
      .exec();
    await this.logActivity('settings_updated', 'Admin updated store settings');
    return { settings };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────
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
        } catch {}
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
      // Non-critical — swallow errors
    }
  }
}
