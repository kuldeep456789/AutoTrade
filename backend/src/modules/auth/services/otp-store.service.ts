import { Injectable } from '@nestjs/common';
const OTP_TTL_MS = 10 * 60 * 1000;

interface OtpEntry {
  code: string;
  expiresAt: number;
  verified: boolean;
}

@Injectable()
export class OtpStoreService {
  private store = new Map<string, OtpEntry>();

  generate(identifier: string): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.store.set(identifier, {
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
      verified: false,
    });
    return code;
  }

  verify(identifier: string, code: string): boolean {
    const entry = this.store.get(identifier);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(identifier);
      return false;
    }
    if (entry.code !== code) return false;
    entry.verified = true;
    this.store.delete(identifier);
    return true;
  }

  isVerified(identifier: string): boolean {
    const entry = this.store.get(identifier);
    return !!entry && entry.verified;
  }

  markVerified(identifier: string): void {
    const entry = this.store.get(identifier);
    if (entry) entry.verified = true;
  }

  invalidate(identifier: string): void {
    this.store.delete(identifier);
  }
}
