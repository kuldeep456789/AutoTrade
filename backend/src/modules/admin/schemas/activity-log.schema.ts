import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ActivityLogDocument = HydratedDocument<ActivityLog>;

@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ required: true })
  action: string;
  @Prop({ required: true })
  description: string;
  @Prop()
  userId?: string;
}
export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
