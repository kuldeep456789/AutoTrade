import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReturnDocument = HydratedDocument<ReturnRequest>;

@Schema({ timestamps: true })
export class ReturnRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  orderId: string;

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

  @Prop({ required: true })
  reason: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({
    required: true,
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

  @Prop()
  refundAmount?: number;

  @Prop({
    enum: ['pending', 'processing', 'completed'],
    default: 'pending',
  })
  refundStatus: string;

  @Prop()
  exchangeSize?: string;

  @Prop({ type: Object })
  pickupAddress?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };

  @Prop()
  adminRemarks?: string;
}

export const ReturnRequestSchema = SchemaFactory.createForClass(ReturnRequest);
