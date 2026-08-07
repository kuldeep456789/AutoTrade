import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { SearchRepository } from '../search/search.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly searchRepository: SearchRepository,
  ) {}

  async getOrders(token: string) {
    const user = await this.resolveUser(token);
    const orders = await this.orderModel
      .find({
        userId: new Types.ObjectId(user.id),
        status: { $ne: 'cancelled' },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    try {
      await this.searchRepository.enrichOrderItemsBatch(orders);
    } catch (e) {
      console.error('[OrdersService] Error hydrating order items', e);
    }

    return { orders };
  }

  async getOrder(token: string | undefined, id: string) {
    if (!token) {
      throw new UnauthorizedException('Bearer token is required');
    }
    const user = await this.resolveUser(token);

    const cleanId = (id || '').trim().replace(/^#/, '');
    let order;

    if (Types.ObjectId.isValid(cleanId) && cleanId.length === 24) {
      order = await this.orderModel.findById(cleanId).lean().exec();
    } else {
      const allOrders = await this.orderModel
        .find()
        .sort({ createdAt: -1 })
        .lean()
        .exec();
      order = allOrders.find(
        (o: any) =>
          o._id.toString().toUpperCase().endsWith(cleanId.toUpperCase()) ||
          o._id.toString().toUpperCase() === cleanId.toUpperCase(),
      );
    }

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const orderUserId = order.userId ? order.userId.toString() : '';
    const userId = user.id || (user as any)._id?.toString() || '';

    if (user.role !== 'admin' && orderUserId !== userId) {
      throw new UnauthorizedException(
        'You do not have permission to access this order',
      );
    }

    try {
      await this.searchRepository.enrichOrderItems(order.items);
    } catch (e) {}

    return { order };
  }

  async createOrder(token: string, dto: CreateOrderDto) {
    const user = await this.resolveUser(token);

    if (!dto.items?.length) {
      throw new BadRequestException('items are required');
    }

    if (dto.totalAmount == null || dto.totalAmount <= 0) {
      throw new BadRequestException('Valid totalAmount is required');
    }

    const paymentMethod = 'Stripe';
    const paymentStatus = 'pending';

    const items = await this.resolveItemVids(dto.items);

    const order = await this.orderModel.create({
      userId: new Types.ObjectId(user.id),
      items,
      totalAmount: dto.totalAmount,
      currency: dto.currency || 'INR',
      status: 'pending',
      paymentProvider: paymentMethod,
      paymentStatus,
      shippingDetails: dto.shippingDetails,
    });

    return {
      order,
      payment: {
        provider: paymentMethod,
        status: paymentStatus,
      },
    };
  }

  async cancelOrder(token: string, id: string) {
    const user = await this.resolveUser(token);
    const order = await this.orderModel.findById(id).exec();
    if (!order) throw new BadRequestException('Order not found');

    const orderUserId = order.userId ? order.userId.toString() : '';
    const userId = user.id || (user as any)._id?.toString() || '';

    if (user.role !== 'admin' && orderUserId !== userId) {
      throw new UnauthorizedException(
        'You do not have permission to cancel this order',
      );
    }

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException(
        'Cannot cancel paid order directly, please request a return',
      );
    }

    order.status = 'cancelled';
    await order.save();
    return { message: 'Order cancelled successfully', order };
  }

  private async resolveItemVids(items: any[]) {
    const withVids = items.filter((i) => i.vid);
    const missing = items.filter((i) => !i.vid);

    if (missing.length === 0) return items;

    const pids = [...new Set(missing.map((i) => i.productId))];
    try {
      const products = await this.searchRepository.findProductsByPids(pids);
      const pidMap = new Map<string, any>();
      for (const p of products) {
        if (!p) continue;
        pidMap.set(String(p.pid || p.id || p._id), p);
      }

      return items.map((item) => {
        if (item.vid) return item;
        const prod = pidMap.get(String(item.productId));
        if (!prod) return item;

        let vid = '';
        if (item.color || item.size) {
          const match = (prod.variants || []).find(
            (v: any) =>
              (!item.color ||
                String(v.color).toLowerCase() ===
                  String(item.color).toLowerCase()) &&
              (!item.size ||
                String(v.size).toLowerCase() ===
                  String(item.size).toLowerCase()),
          );
          vid = match?.vid || '';
        }
        if (!vid) vid = prod.variants?.[0]?.vid || prod.vid || '';
        return { ...item, vid };
      });
    } catch (err) {
      console.error('[OrdersService] resolveItemVids error:', err);
      return items;
    }
  }

  private async resolveUser(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      return user;
    } catch (error) {
      console.error('[OrdersService] resolveUser error:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
