import { Injectable, Optional, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

const OTP_TTL_SECONDS = 10 * 60; // 10 minutes in seconds
const OTP_TTL_MS = OTP_TTL_SECONDS * 1000;

interface OtpEntry {
  code: string;
  expiresAt: number;
  verified: boolean;
}

@Injectable()
export class OtpStoreService {
  private readonly logger = new Logger(OtpStoreService.name);
  private store = new Map<string, OtpEntry>();

  constructor(
    @Optional() private readonly redisService?: RedisService,
  ) {}

  async generate(identifier: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const entry: OtpEntry = {
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
      verified: false,
    };

    this.store.set(identifier, entry);

    if (this.redisService?.isReady()) {
      await this.redisService.setJson(`otp:${identifier}`, entry, OTP_TTL_SECONDS);
    }

    return code;
  }

  async verify(identifier: string, code: string): Promise<boolean> {
    let entry: OtpEntry | null = null;

    if (this.redisService?.isReady()) {
      entry = await this.redisService.getJson<OtpEntry>(`otp:${identifier}`);
    }

    if (!entry) {
      entry = this.store.get(identifier) || null;
    }

    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      await this.invalidate(identifier);
      return false;
    }
    if (entry.code !== code) return false;

    entry.verified = true;
    await this.invalidate(identifier);
    return true;
  }

  async isVerified(identifier: string): Promise<boolean> {
    let entry: OtpEntry | null = null;

    if (this.redisService?.isReady()) {
      entry = await this.redisService.getJson<OtpEntry>(`otp:${identifier}`);
    }

    if (!entry) {
      entry = this.store.get(identifier) || null;
    }

    return !!entry && entry.verified;
  }

  async markVerified(identifier: string): Promise<void> {
    const entry: OtpEntry = {
      code: 'VERIFIED_FLAG',
      expiresAt: Date.now() + OTP_TTL_MS,
      verified: true,
    };

    this.store.set(identifier, entry);

    if (this.redisService?.isReady()) {
      await this.redisService.setJson(`otp:${identifier}`, entry, OTP_TTL_SECONDS);
    }
  }

  async invalidate(identifier: string): Promise<void> {
    this.store.delete(identifier);
    if (this.redisService?.isReady()) {
      await this.redisService.del(`otp:${identifier}`);
    }
  }
}
