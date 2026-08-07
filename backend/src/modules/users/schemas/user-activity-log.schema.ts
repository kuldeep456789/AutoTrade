import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserActivityLogDocument = HydratedDocument<UserActivityLog>;

export enum EventType {
  REGISTRATION_STARTED = 'registration_started',
  ACCOUNT_CREATED = 'account_created',
  EMAIL_VERIFICATION_SENT = 'verification_email_sent',
  EMAIL_VERIFIED = 'email_verified',
  VERIFICATION_EXPIRED = 'verification_expired',
  REGISTRATION_ABANDONED = 'registration_abandoned',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  ACCOUNT_DELETED = 'account_deleted',
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
  NA = 'n/a',
}

export enum RegistrationStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class UserActivityLog {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  userId?: Types.ObjectId;

  @Prop({ required: false })
  userName?: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, enum: EventType })
  eventType: string;

  @Prop({ required: true, enum: VerificationStatus, default: VerificationStatus.NA })
  verificationStatus: string;

  @Prop({ required: true, enum: RegistrationStatus, default: RegistrationStatus.COMPLETED })
  registrationStatus: string;

  @Prop({ required: false })
  ipAddress?: string;

  @Prop({ required: false })
  userAgent?: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
  
  @Prop({ default: Date.now })
  createdAt: Date;
}

export const UserActivityLogSchema = SchemaFactory.createForClass(UserActivityLog);

UserActivityLogSchema.index({ eventType: 1, createdAt: -1 });
UserActivityLogSchema.index({ userId: 1, createdAt: -1 });
UserActivityLogSchema.index({ email: 1, createdAt: -1 });
