import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { ReturnRequest } from './schemas/return.schema';
import { Order } from '../orders/schemas/order.schema';

@Injectable()
export class ReturnsService {

  private readonly ACTIVE_STATUSES = [
    'requested',
    'approved',
    'item_received',
  ];

  constructor(
    @InjectModel(ReturnRequest.name)
    private readonly returnModel: Model<ReturnRequest>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) { }

  async create(token: string, dto: CreateReturnDto) {
    const user = await this.resolveUser(token);
    if (!dto.orderId || !dto.reason) {
      throw new BadRequestException('orderId and reason are required');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one item is required');
    }

    const cleanOrderId = dto.orderId
      .replace(/^(ORDER-|DF-)/i, '')
      .replace(/[^a-zA-Z0-9]/g, '');

    // Find the order
    let order;
    if (Types.ObjectId.isValid(cleanOrderId) && cleanOrderId.length === 24) {
      order = await this.orderModel
        .findOne({ _id: cleanOrderId, userId: new Types.ObjectId(user.id) })
        .exec();
    } else {
      const orders = await this.orderModel
        .find({ userId: new Types.ObjectId(user.id) })
        .sort({ createdAt: -1 })
        .limit(100)
        .exec();
      order = orders.find((o) =>
        o._id.toString().toUpperCase().endsWith(cleanOrderId.toUpperCase()),
      );
    }

    if (!order) {
      throw new BadRequestException(
        'Order not found or does not belong to you',
      );
    }

    if (order.status !== 'delivered') {
      throw new BadRequestException(
        'You can only return orders that have been delivered',
      );
    }


    const activeReturnsForOrder = await this.returnModel
      .find({
        userId: new Types.ObjectId(user.id),
        orderId: order._id.toString(),
        status: { $in: this.ACTIVE_STATUSES },
      })
      .exec();

    if (activeReturnsForOrder.length > 0) {
      const incomingProductIds = new Set(
        dto.items.map((item) => item.productId),
      );

      const alreadyRequestedProductIds = new Set<string>();
      for (const activeReturn of activeReturnsForOrder) {
        for (const item of activeReturn.items || []) {
          if (incomingProductIds.has(item.productId)) {
            alreadyRequestedProductIds.add(item.productId);
          }
        }
      }

      if (alreadyRequestedProductIds.size > 0) {
        throw new ConflictException(
          `A return request is already in progress for: ${Array.from(
            alreadyRequestedProductIds,
          ).join(', ')}`,
        );
      }
    }

    console.log('DTO =====================');
    console.log(JSON.stringify(dto, null, 2));

    console.log('CREATE OBJECT =====================');

    const payload = {
      userId: new Types.ObjectId(user.id),
      orderId: order._id.toString(),
      items: dto.items,
      totalItems: dto.items.length,
      totalReturnAmount: dto.items.reduce(
        (sum, item) => sum + ((item.price || 0) * item.quantity),
        0,
      ),
      reason: dto.reason,
      description: dto.description,
      images: dto.images || [],
      exchangeSize: dto.exchangeSize,
      pickupAddress: dto.pickupAddress,
    };

    console.log(JSON.stringify(payload, null, 2));

    const ret = await this.returnModel.create(payload);
    return { return: ret };
  }

  async getMyReturns(token: string) {
    const user = await this.resolveUser(token);
    const returns = await this.returnModel
      .find({ userId: new Types.ObjectId(user.id) })
      .sort({ createdAt: -1 })
      .exec();
    return { returns };
  }

  async getById(token: string, id: string) {
    const user = await this.resolveUser(token);
    const ret = await this.returnModel
      .findOne({ _id: id, userId: new Types.ObjectId(user.id) })
      .exec();
    if (!ret) throw new BadRequestException('Return request not found');
    return { return: ret };
  }

  async getAll(token: string) {
    const user = await this.resolveUser(token);
    if (user.role !== 'admin') {
      throw new UnauthorizedException('Admin access required');
    }
    const returns = await this.returnModel
      .find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .exec();

    return { returns };
  }

  async updateStatus(
    token: string,
    id: string,
    body: { status: string; adminRemarks?: string },
  ) {
    const user = await this.resolveUser(token);
    if (user.role !== 'admin') {
      throw new UnauthorizedException('Admin access required');
    }
    const ret = await this.returnModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: body.status,
            ...(body.adminRemarks ? { adminRemarks: body.adminRemarks } : {}),
          },
        },
        { new: true },
      )
      .exec();
    if (!ret) throw new BadRequestException('Return request not found');
    return { return: ret };
  }

  private async resolveUser(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new UnauthorizedException('User no longer exists');
      return user;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
