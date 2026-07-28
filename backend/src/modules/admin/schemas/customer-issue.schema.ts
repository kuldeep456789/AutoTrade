import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
export type CustomerIssueDocument = CustomerIssue & Document;
@Schema({ timestamps: true })
export class CustomerIssue {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  priority: string;

  @Prop({
    required: true,
    enum: ['open', 'in_progress', 'resolved'],
    default: 'open',
  })
  status: string;
}

export const CustomerIssueSchema = SchemaFactory.createForClass(CustomerIssue);
