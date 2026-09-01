import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { UsersService } from '../users/users.service';
import { CjService } from '../cj/cj.service';
import { RedisService } from '../redis/redis.service';
import { Order } from '../orders/schemas/order.schema';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

interface PendingIntent {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    vid?: string;
    sku?: string;
    color?: string;
    size?: string;
  }>;
  totalAmount: number;
  currency: string;
  shippingDetails?: Record<string, any>;
  existingOrderId?: string;
  createdAt: number;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe?: Stripe;
  private readonly pendingTtlMs = 2 * 60 * 60 * 1000; // 2 hours
  private readonly pendingFallback = new Map<string, PendingIntent>();
  private readonly fallbackRates: Record<string, number> = {
    INR: 1.0,
    USD: 0.01198,
    EUR: 0.01105,
  };
  private readonly allowedCurrencies = ['INR', 'USD', 'EUR'];

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly cjService: CjService,
    private readonly redisService: RedisService,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    } else {
      this.logger.warn(
        'Stripe secret key is missing or invalid. Online payment endpoints will be disabled.',
      );
    }
  }

  async createCheckoutSession(token: string, dto: CreateCheckoutSessionDto) {
    const user = await this.resolveUser(token);

    if (dto.orderId) {
      return this.createSessionForExistingOrder(user, dto);
    }

    return this.createSessionForCheckout(user, dto);
  }

  private async createSessionForExistingOrder(
    user: any,
    dto: CreateCheckoutSessionDto,
  ) {
    const order = await this.getOwnedOrder(user.id, dto.orderId as string);

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('Order is already paid');
    }

    const targetCurrency = this.validateCurrency(dto.currency || 'INR');
    const totalAmount = Number(order.totalAmount || 0);

    const lineItems = [
      {
        quantity: 1,
        price_data: {
          currency: this.stripeCurrency(targetCurrency),
          unit_amount: this.toSubunits(totalAmount, targetCurrency),
          product_data: {
            name: `AutoTrade Order #${order.id}`,
          },
        },
      },
    ];

    const refId = this.newRefId();
    const session = await this.createSession(user, {
      refId,
      lineItems,
      successDescription: `Order #${order.id}`,
    });

    order.checkoutSessionId = session.id;
    await order.save();

    const intent: PendingIntent = {
      userId: user.id,
      items: [],
      totalAmount,
      currency: targetCurrency,
      existingOrderId: order.id,
      createdAt: Date.now(),
    };
    await this.storePending(refId, intent);

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  private async createSessionForCheckout(
    user: any,
    dto: CreateCheckoutSessionDto,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException('items are required');
    }

    const totalAmount = Number(dto.totalAmount);
    if (!Number.isFinite(totalAmount) || totalAmount < 1) {
      throw new BadRequestException(
        'Order total must be greater than zero before online payment can be created',
      );
    }

    const targetCurrency = this.validateCurrency(dto.currency || 'INR');
    const lineItems = this.buildLineItems(
      dto.items!,
      totalAmount,
      targetCurrency,
    );

    const refId = this.newRefId();
    const session = await this.createSession(user, {
      refId,
      lineItems,
      successDescription: 'Place your order',
    });

    const intent: PendingIntent = {
      userId: user.id,
      items: dto.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        vid: item.vid,
        sku: item.sku,
        color: item.color,
        size: item.size,
      })),
      totalAmount,
      currency: targetCurrency,
      shippingDetails: dto.shippingDetails,
      createdAt: Date.now(),
    };
    await this.storePending(refId, intent);

    return { checkoutUrl: session.url, sessionId: session.id };
  }

  private buildLineItems(
    items: CreateCheckoutSessionDto['items'] & any[],
    totalAmount: number,
    targetCurrency: string,
  ) {
    const itemsTotal = items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * item.quantity,
      0,
    );
    const targetSubtotal = this.toSubunits(totalAmount, targetCurrency);

    if (!itemsTotal) {
      return [
        {
          quantity: 1,
          price_data: {
            currency: this.stripeCurrency(targetCurrency),
            unit_amount: targetSubtotal,
            product_data: { name: 'AutoTrade Order' },
          },
        },
      ];
    }

    const lineItems = items.map((item) => {
      const fraction = (Number(item.price) || 0) * item.quantity / itemsTotal;
      const lineSubtotal = Math.round(targetSubtotal * fraction);
      const unitAmount = Math.max(1, Math.round(lineSubtotal / item.quantity));

      return {
        quantity: item.quantity,
        price_data: {
          currency: this.stripeCurrency(targetCurrency),
          unit_amount: unitAmount,
          product_data: {
            name: item.name || `Product ${item.productId}`,
            images: item.image ? [item.image] : [],
          },
        },
      };
    });

    const currentTotal = lineItems.reduce(
      (sum, line) => sum + line.quantity * line.price_data.unit_amount,
      0,
    );
    const remainder = targetSubtotal - currentTotal;
    if (remainder !== 0 && lineItems.length) {
      const last = lineItems[lineItems.length - 1];
      last.price_data.unit_amount = Math.max(
        1,
        last.price_data.unit_amount + remainder,
      );
    }

    return lineItems;
  }

  private async createSession(
    user: any,
    opts: {
      refId: string;
      lineItems: any[];
      successDescription: string;
    },
  ) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured on this server');
    }

    const envReturnBase = process.env.STRIPE_RETURN_BASE_URL || process.env.BACKEND_URL;
    const isLocalReturnBase = !envReturnBase || envReturnBase.includes('localhost') || envReturnBase.includes('127.0.0.1');
    const returnBase =
      (process.env.NODE_ENV === 'production' || isLocalReturnBase)
        ? (process.env.BACKEND_URL || 'https://autotrade-1-k96m.onrender.com')
        : (envReturnBase || 'https://autotrade-1-k96m.onrender.com');

    return this.stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user?.email || undefined,
      line_items: opts.lineItems,
      client_reference_id: opts.refId,
      metadata: { checkout_ref: opts.refId, userId: String(user.id) },
      payment_intent_data: {
        metadata: { checkout_ref: opts.refId },
      },
      success_url: `${returnBase}/api/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnBase}/api/payments/cancel`,
      allow_promotion_codes: false,
      locale: 'auto',
    });
  }

  async handleWebhook(signature: string | undefined, payload: Buffer) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured on this server');
    }

    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!secret) {
      throw new BadRequestException('Stripe webhook secret is not configured');
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature ?? '',
        secret,
      );
    } catch (err: any) {
      this.logger.warn(`Stripe webhook signature verification failed: ${err?.message}`);
      throw new BadRequestException('Invalid Stripe signature');
    }

    try {
      if (event.type === 'checkout.session.completed') {
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
      } else if (event.type === 'payment_intent.succeeded') {
        await this.handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
      } else if (event.type === 'payment_intent.payment_failed') {
        const intent = event.data.object as Stripe.PaymentIntent;
        this.logger.warn(
          `Payment failed for intent ${intent.id}: ${intent.last_payment_error?.message ?? 'unknown error'
          }`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Stripe webhook handling failed: ${err?.message ?? err}`);
    }

    return { received: true };
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const refId =
      session.client_reference_id ||
      (session.metadata?.checkout_ref as string | undefined);
    if (!refId) return;

    const intent = await this.loadPending(refId);
    if (!intent) return;

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    if (intent.existingOrderId) {
      const order = await this.orderModel.findById(intent.existingOrderId).exec();
      if (order && order.paymentStatus !== 'paid') {
        order.checkoutSessionId = session.id;
        order.paymentIntentId = paymentIntentId;
        order.paymentReference = session.id;
        order.paymentStatus = 'paid';
        order.status = 'confirmed';
        // Keep the order's displayed currency in sync with what was actually
        // charged at checkout (the order may have been created in a
        // different currency than the one the user paid in).
        order.currency = intent.currency;
        await order.save();
        this.syncCj(order);
      }
    } else {
      const existing = await this.orderModel
        .findOne({ checkoutSessionId: session.id })
        .exec();
      if (existing) {
        this.syncCj(existing);
      } else {
        const order = await this.orderModel.create({
          userId: new Types.ObjectId(intent.userId),
          items: intent.items,
          totalAmount: intent.totalAmount,
          currency: intent.currency,
          status: 'confirmed',
          paymentProvider: 'Stripe',
          paymentStatus: 'paid',
          paymentReference: session.id,
          checkoutSessionId: session.id,
          paymentIntentId,
          shippingDetails: intent.shippingDetails,
        });
        this.syncCj(order);
      }
    }

    await this.deletePending(refId);
  }

  private async handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
    const refId = intent.metadata?.checkout_ref;
    if (refId) {
      await this.handleCheckoutCompleted({
        id: `cs_pending_${refId}`,
        client_reference_id: refId,
        metadata: { checkout_ref: refId },
        payment_intent: intent.id,
      } as any);
      return;
    }

    const order = await this.orderModel
      .findOne({ paymentIntentId: intent.id })
      .exec();
    if (order && order.paymentStatus !== 'paid') {
      order.paymentStatus = 'paid';
      order.status = 'confirmed';
      await order.save();
      this.syncCj(order);
    }
  }

  async confirmSuccess(sessionId: string): Promise<string | null> {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured on this server');
    }
    if (!sessionId) {
      throw new BadRequestException('session_id is required');
    }

    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return null;
    }

    await this.handleCheckoutCompleted(session);

    let paymentIntentId: string | undefined =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;

    const order = await this.orderModel
      .findOne({ checkoutSessionId: session.id })
      .exec();
    if (!order) return null;

    if (paymentIntentId) {
      try {
        const pi = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        const chargeId =
          typeof pi.latest_charge === 'string'
            ? pi.latest_charge
            : pi.latest_charge?.id;
        if (chargeId) {
          const charge = await this.stripe.charges.retrieve(chargeId);
          if (charge.receipt_url && !order.receiptUrl) {
            order.receiptUrl = charge.receipt_url;
            await order.save();
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to fetch receipt for ${paymentIntentId}: ${err?.message}`);
      }
    }

    return String(order._id);
  }

  private validateCurrency(currency: string): string {
    const normalized = (currency || 'INR').toUpperCase();
    if (!this.allowedCurrencies.includes(normalized)) {
      throw new BadRequestException(
        `Unsupported currency "${currency}". Allowed currencies: ${this.allowedCurrencies.join(', ')}`,
      );
    }
    return normalized;
  }

  private toSubunits(amount: number, currency: string): number {
    const rate = this.fallbackRates[currency] ?? 1.0;
    const isBaseInr = currency === 'INR';
    const convertedAmount = isBaseInr
      ? Number(amount)
      : Number(amount) * rate;
    const subunits = Math.round(convertedAmount * 100);
    if (!Number.isFinite(subunits) || subunits < 1) {
      throw new BadRequestException(
        'Order total must be greater than zero before online payment can be created',
      );
    }
    return subunits;
  }

  private stripeCurrency(currency: string): string {
    return (currency || 'INR').toLowerCase();
  }

  private newRefId(): string {
    return `stripe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private syncCj(order: any) {
    setImmediate(() => {
      this.cjService.syncOrderToCj(order).catch((err) => {
        this.logger.error(
          `Failed async CJ order sync for order ${order.id}: ${err?.message ?? err}`,
        );
      });
    });
  }

  private async storePending(refId: string, intent: PendingIntent) {
    const key = this.pendingKey(refId);
    this.pendingFallback.set(key, intent);
    if (this.redisService.isReady()) {
      await this.redisService.setJson(
        key,
        intent,
        Math.floor(this.pendingTtlMs / 1000),
      );
    }
  }

  private async loadPending(refId: string): Promise<PendingIntent | null> {
    const key = this.pendingKey(refId);

    const fallback = this.pendingFallback.get(key);
    if (fallback) {
      if (Date.now() - fallback.createdAt > this.pendingTtlMs) {
        this.pendingFallback.delete(key);
      } else {
        return fallback;
      }
    }

    if (this.redisService.isReady()) {
      const fromRedis = await this.redisService.getJson<PendingIntent>(key);
      if (fromRedis) return fromRedis;
    }

    return null;
  }

  private async deletePending(refId: string) {
    const key = this.pendingKey(refId);
    this.pendingFallback.delete(key);
    if (this.redisService.isReady()) {
      await this.redisService.del(key);
    }
  }

  private pendingKey(refId: string) {
    return `stripe:pending:${refId}`;
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
    const cleanOrderId = (orderId || '').trim().replace(/^#/, '');
    const cleanUserId = (userId || '').trim();
    if (!Types.ObjectId.isValid(cleanOrderId)) {
      return null;
    }
    const filter: any = { _id: new Types.ObjectId(cleanOrderId) };
    if (Types.ObjectId.isValid(cleanUserId)) {
      filter.userId = new Types.ObjectId(cleanUserId);
    }
    return this.orderModel.findOne(filter).exec();
  }
}