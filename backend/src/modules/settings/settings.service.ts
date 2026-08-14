import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from './schemas/settings.schema';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly CACHE_KEY = 'global:settings';

  constructor(
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
    private readonly redisService: RedisService,
  ) {}

  async getSettings(): Promise<Settings> {
    // Try cache first
    const cached = await this.redisService.getJson<Settings>(this.CACHE_KEY);
    if (cached && (cached as any).adminSecretCode && (cached as any).currencyRateUSD !== undefined) {
      return cached;
    }

    // Fetch from DB
    let settings = await this.settingsModel.findOne().exec();
    
    // Create default if not exists
    if (!settings) {
      settings = await this.settingsModel.create({
        currencyRateUSD: 0.012,
        currencyRateEUR: 0.011,
        currencyRateINR: 1,
        gstPercentage: 18,
        adminSecretCode: process.env.ADMIN_SECRET_CODE || 'secret_admin_123',
      });
    } else {
      let needsSave = false;
      if (settings.currencyRateUSD === undefined) { settings.currencyRateUSD = 0.012; needsSave = true; }
      if (settings.currencyRateEUR === undefined) { settings.currencyRateEUR = 0.011; needsSave = true; }
      if (settings.currencyRateINR === undefined) { settings.currencyRateINR = 1; needsSave = true; }
      if (settings.gstPercentage === undefined) { settings.gstPercentage = 18; needsSave = true; }
      if (!settings.adminSecretCode) { settings.adminSecretCode = process.env.ADMIN_SECRET_CODE || 'secret_admin_123'; needsSave = true; }
      if (needsSave) {
        await settings.save();
      }
    }

    // Cache it
    await this.redisService.setJson(this.CACHE_KEY, settings, 86400); // 1 day

    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<Settings> {
    let settings = await this.settingsModel.findOne().exec();
    
    if (!settings) {
      settings = new this.settingsModel();
    }

    if (dto.currencyRateUSD !== undefined) settings.currencyRateUSD = dto.currencyRateUSD;
    if (dto.currencyRateEUR !== undefined) settings.currencyRateEUR = dto.currencyRateEUR;
    if (dto.currencyRateINR !== undefined) settings.currencyRateINR = dto.currencyRateINR;
    if (dto.gstPercentage !== undefined) settings.gstPercentage = dto.gstPercentage;
    if (dto.adminSecretCode !== undefined) settings.adminSecretCode = dto.adminSecretCode;
    if (dto.defaultDiscountPct !== undefined) (settings as any).defaultDiscountPct = dto.defaultDiscountPct;
    if (dto.storeName !== undefined) settings.storeName = dto.storeName;
    if (dto.storeEmail !== undefined) settings.storeEmail = dto.storeEmail;
    if (dto.currency !== undefined) settings.currency = dto.currency;
    if (dto.gstRate !== undefined) settings.gstRate = dto.gstRate;
    if (dto.commissionRate !== undefined) settings.commissionRate = dto.commissionRate;

    await settings.save();

    // Update cache
    await this.redisService.setJson(this.CACHE_KEY, settings, 86400);

    return settings;
  }
}
