import { Allow, IsArray, IsBoolean, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsNumber()
  currencyRateUSD?: number;

  @IsOptional()
  @IsNumber()
  currencyRateEUR?: number;

  @IsOptional()
  @IsNumber()
  currencyRateINR?: number;

  @IsOptional()
  @IsNumber()
  gstPercentage?: number;

  @IsOptional()
  @IsString()
  adminSecretCode?: string;

  @IsOptional()
  @IsNumber()
  defaultDiscountPct?: number;

  @IsOptional()
  @IsString()
  storeName?: string;

  @IsOptional()
  @IsString()
  storeEmail?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  heroBannerImages?: string[];

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsNumber()
  freeShippingThreshold?: number;

  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @IsOptional()
  @IsNumber()
  gstRate?: number;

  @IsOptional()
  @IsNumber()
  commissionRate?: number;

  @IsOptional()
  @IsNumber()
  gatewayFeePercent?: number;

  @IsOptional()
  @IsNumber()
  gatewayFixedFee?: number;

  @IsOptional()
  @IsNumber()
  settlementCycleDays?: number;

  @IsOptional()
  @Allow()
  _id?: any;

  @IsOptional()
  @Allow()
  id?: any;

  @IsOptional()
  @Allow()
  __v?: any;

  @IsOptional()
  @Allow()
  createdAt?: any;

  @IsOptional()
  @Allow()
  updatedAt?: any;

  @IsOptional()
  @Allow()
  settings?: any;
}
