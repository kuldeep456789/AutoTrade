import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReturnDocument = HydratedDocument<ReturnRequest>;

@Schema({ _id: false })
export class ReturnItem {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  productName: string;

  @Prop()
  productImage?: string;

  @Prop()
  productSize?: string;

  @Prop()
  productColor?: string;

  @Prop({ default: 1 })
  quantity: number;

  @Prop()
  price?: number;

  @Prop()
  sku?: string;

  @Prop()
  variantId?: string;
}

export const ReturnItemSchema =
  SchemaFactory.createForClass(ReturnItem);

@Schema({ timestamps: true })
export class ReturnRequest {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    index: true,
  })
  orderId: string;

  @Prop({
    type: [ReturnItemSchema],
    required: true,
    default: [],
  })
  items: ReturnItem[];

  @Prop({
    required: true,
  })
  reason: string;

  @Prop()
  description?: string;

  @Prop({
    type: [String],
    default: [],
  })
  images: string[];

  @Prop({
    enum: [
      'requested',
      'approved',
      'item_received',
      'refunded',
      'rejected',
      'item_not_received',
      'not_refunded',
    ],
    default: 'requested',
  })
  status: string;

  @Prop()
  pickupDate?: Date;

  @Prop({
    default: 0,
  })
  refundAmount?: number;

  @Prop({
    enum: ['pending', 'processing', 'completed'],
    default: 'pending',
  })
  refundStatus: string;

  @Prop()
  exchangeSize?: string;

  @Prop({
    type: Object,
  })
  pickupAddress?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };

  @Prop()
  adminRemarks?: string;

  @Prop({
    default: 0,
  })
  totalItems: number;

  @Prop({
    default: 0,
  })
  totalReturnAmount: number;

  @Prop()
  approvedBy?: string;

  @Prop()
  approvedAt?: Date;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  refundTransactionId?: string;

  @Prop()
  pickupTrackingId?: string;

  @Prop({
    default: false,
  })
  isExchange: boolean;

  @Prop()
  exchangeOrderId?: string;
}

export const ReturnRequestSchema =
  SchemaFactory.createForClass(ReturnRequest);

ReturnRequestSchema.index({
  userId: 1,
  orderId: 1,
});

ReturnRequestSchema.index({
  status: 1,
});

ReturnRequestSchema.index({
  createdAt: -1,
});