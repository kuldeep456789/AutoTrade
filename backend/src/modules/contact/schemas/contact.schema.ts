import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Contact extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: 'pending', enum: ['pending', 'resolved'] })
  status: string;

  @Prop()
  adminReply: string;

  @Prop()
  repliedAt: Date;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);
