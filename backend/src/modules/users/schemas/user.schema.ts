import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ trim: true, sparse: true })
  phone?: string;

  @Prop({ default: 'customer' })
  role: string;

  @Prop({ trim: true })
  avatar?: string;

  @Prop({ trim: true })
  gender?: string;

  @Prop()
  dateOfBirth?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
