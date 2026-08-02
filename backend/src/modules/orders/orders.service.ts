import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './schemas/order.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) { }

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
      const ProductModel = this.orderModel.db.model('Product');
      for (const order of orders) {
        for (const item of order.items) {
          const product: any = await ProductModel.findOne({ pid: item.productId }).select('images').lean().exec();
          if (product && product.images && product.images.length > 0) {
            (item as any).image = product.images[0];
          }
        }
      }
    } catch (e) {
      console.error('[OrdersService] Error attaching images to orders', e);
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
      order = await this.orderModel.findById(cleanId).exec();
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
      const ProductModel = this.orderModel.db.model('Product');
      for (const item of order.items) {
        if (item.productId) {
          // const product: any = await ProductModel.findOne({ pid: item.productId }).select('images').lean().exec();
          // if (product && product.images && product.images.length > 0) {
          //   (item as any).image = product.images[0];
          // }
          const product: any = await ProductModel.findOne({
            pid: item.productId,
          })
            .select(`
    pid
    images
    title
    productName
    name
    price
    discountPrice
    colors
    sizes
    sku
  `)
            .lean()
            .exec();

          if (product) {
            (item as any).image =
              product.images?.[0] ?? null;

            (item as any).productName =
              product.title ||
              product.productName ||
              product.name ||
              'Unknown Product';

            (item as any).price =
              product.discountPrice ||
              product.price ||
              0;

            (item as any).sku =
              product.sku || '';

            (item as any).color =
              item.variant?.color ||
              product.colors?.[0] ||
              '';

            (item as any).size =
              item.variant?.size ||
              product.sizes?.[0] ||
              '';
          }
        }
      }
    } catch (e) { }

    return { order };
  }

  async createOrder(token: string, dto: CreateOrderDto) {
    const user = await this.resolveUser(token);

    if (!dto.items?.length) {
      throw new BadRequestException('items are required');
    }

    if (dto.totalAmount == null || dto.totalAmount < 0) {
      throw new BadRequestException('totalAmount is required');
    }

    if (dto.totalAmount < 50000) {
      throw new BadRequestException('Minimum order value is ₹50,000');
    }

    const paymentMethod = 'Razorpay';
    const paymentStatus = 'unpaid';

    const order = await this.orderModel.create({
      userId: new Types.ObjectId(user.id),
      items: dto.items,
      totalAmount: dto.totalAmount,
      status: 'pending',
      paymentProvider: paymentMethod,
      paymentStatus,
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
      throw new UnauthorizedException('You do not have permission to cancel this order');
    }

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Cannot cancel paid order directly, please request a return');
    }

    order.status = 'cancelled';
    await order.save();
    return { message: 'Order cancelled successfully', order };
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
