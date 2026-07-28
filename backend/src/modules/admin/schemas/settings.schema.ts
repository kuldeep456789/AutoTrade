import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingsDocument = HydratedDocument<Settings>;

@Schema({ timestamps: true })
export class Settings {
  @Prop({ default: 'Vastra' })
  storeName: string;

  @Prop({ default: 'hello@vastra.in' })
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

  // Finance & Commission Settings
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
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
