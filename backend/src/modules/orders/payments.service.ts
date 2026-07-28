import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'crypto';
import Razorpay from 'razorpay';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { CjService } from '../cj/cj.service';
import { Order } from './schemas/order.schema';
import { CreatePaymentOrderDto } from './dto/create-payment-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay?: Razorpay;
  private readonly minGatewayAmountPaise = 100;

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly cjService: CjService,
  ) {
    const keyId = process.env.RAZORPAY_KEY_ID?.trim();
    const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

    if (keyId && keySecret) {
      this.razorpay = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    } else {
      this.logger.warn(
        'Razorpay credentials are missing or invalid. Online payment endpoints will be disabled.',
      );
    }
  }

  async createPaymentOrder(token: string, dto: CreatePaymentOrderDto) {
    const user = await this.resolveUser(token);
    const order = await this.getOwnedOrder(user.id, dto.orderId);

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order is already paid');
    }

    if (order.paymentProvider !== 'Razorpay') {
      throw new BadRequestException('Unsupported payment method');
    }

    const amountPaise = Math.round(Number(order.totalAmount) * 100);
    if (
      !Number.isFinite(amountPaise) ||
      amountPaise < this.minGatewayAmountPaise
    ) {
      throw new BadRequestException(
        'Order total must be at least $0.01 before online payment can be created',
      );
    }

    if (!this.razorpay) {
      throw new BadRequestException(
        'Razorpay is not configured on this server',
      );
    }

    const gatewayOrder = (await this.razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: order.id,
      payment_capture: true,
    })) as { id: string };

    order.razorpayOrderId = gatewayOrder.id;
    order.paymentReference = gatewayOrder.id;
    await order.save();

    return {
      order,
      gatewayOrder,
      keyId: process.env.RAZORPAY_KEY_ID?.trim() ?? '',
    };
  }

  async verifyPayment(token: string, dto: VerifyPaymentDto) {
    const user = await this.resolveUser(token);
    const order = await this.getOwnedOrder(user.id, dto.orderId);

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (!order.razorpayOrderId) {
      throw new BadRequestException('Payment order has not been created');
    }

    if (order.razorpayOrderId !== dto.razorpayOrderId) {
      throw new BadRequestException('Razorpay order does not match');
    }

    const expectedSignature = createHmac(
      'sha256',
      process.env.RAZORPAY_KEY_SECRET ?? '',
    )
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    order.razorpayOrderId = dto.razorpayOrderId;
    order.razorpayPaymentId = dto.razorpayPaymentId;
    order.razorpaySignature = dto.razorpaySignature;
    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    await order.save();

    // Asynchronously trigger CJ Dropshipping Order Fulfillment in the background
    setImmediate(() => {
      this.cjService.syncOrderToCj(order).catch((err) => {
        this.logger.error(
          `Failed async CJ order sync for order ${order.id}: ${err?.message ?? err}`,
        );
      });
    });

    return { order };
  }

  private async resolveUser(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      return user;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async getOwnedOrder(userId: string, orderId: string) {
    return this.orderModel
      .findOne({ _id: orderId, userId: new Types.ObjectId(userId) })
      .exec();
  }
}
