import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
export type OrderDocument = HydratedDocument<Order>;
@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: String, required: true })
  productId: string;

  @Prop({ type: String })
  vid?: string;

  @Prop({ type: String })
  sku?: string;

  @Prop({ type: String })
  color?: string;

  @Prop({ type: String })
  size?: string;

  @Prop({ required: true })
  quantity: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class ShippingDetails {
  @Prop()
  customerName?: string;

  @Prop()
  address?: string;

  @Prop()
  city?: string;

  @Prop()
  province?: string;

  @Prop()
  countryCode?: string;

  @Prop()
  country?: string;

  @Prop()
  zip?: string;

  @Prop()
  phone?: string;
}

export const ShippingDetailsSchema =
  SchemaFactory.createForClass(ShippingDetails);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], default: [] })
  items: OrderItem[];

  @Prop({ required: true, default: 0 })
  totalAmount: number;

  @Prop({ required: true, enum: ['INR', 'USD', 'EUR'], default: 'INR' })
  currency: string;

  @Prop({ required: true, default: 'pending' })
  status: string;

  @Prop({ required: true, default: 'Stripe' })
  paymentProvider: string;

  @Prop({
    required: true,
    enum: ['paid', 'pending', 'failed'],
    default: 'pending',
  })
  paymentStatus: string;

  @Prop()
  paymentReference?: string;

  @Prop()
  checkoutSessionId?: string;

  @Prop()
  paymentIntentId?: string;

  @Prop()
  receiptUrl?: string;

  @Prop()
  cjOrderId?: string;

  @Prop({ type: [String], default: [] })
  cjOrderIds?: string[];

  @Prop()
  cjSyncError?: string;

  @Prop({ type: ShippingDetailsSchema })
  shippingDetails?: ShippingDetails;

  @Prop({ default: 'CJPacket' })
  logisticName?: string;

  @Prop({ default: 'CN' })
  fromCountryCode?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
