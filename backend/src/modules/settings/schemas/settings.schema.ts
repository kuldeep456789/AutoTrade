import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingsDocument = HydratedDocument<Settings>;

@Schema({ timestamps: true, strict: false })
export class Settings {
  @Prop({ default: 'AutoTrade' })
  storeName: string;

  @Prop({ default: 'hello@autotrade.in' })
  storeEmail: string;

  @Prop({ default: 'INR' })
  currency: string;

  @Prop({ type: [String], default: [] })
  heroBannerImages: string[];

  @Prop({ default: false })
  maintenanceMode: boolean;

  @Prop({ default: 499 })
  freeShippingThreshold: number;

  @Prop({ type: Object, default: {} })
  socialLinks: Record<string, string>;

  @Prop({ trim: true })
  logoUrl?: string;

  @Prop({ trim: true })
  faviconUrl?: string;

  @Prop({ default: 18 })
  gstRate: number;

  @Prop({ default: 10 })
  commissionRate: number;

  @Prop({ default: 2.9 })
  gatewayFeePercent: number;

  @Prop({ default: 0.3 })
  gatewayFixedFee: number;

  @Prop({ default: 7 })
  settlementCycleDays: number;

  @Prop({ required: true, default: 0.012 })
  currencyRateUSD: number;

  @Prop({ required: true, default: 0.011 })
  currencyRateEUR: number;

  @Prop({ required: true, default: 1 })
  currencyRateINR: number;

  @Prop({ required: true, default: 18 })
  gstPercentage: number;

  @Prop({ default: 'secret_admin_123' })
  adminSecretCode: string;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
