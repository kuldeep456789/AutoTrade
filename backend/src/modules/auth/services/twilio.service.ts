import { Injectable, Logger } from '@nestjs/common';
import Twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private client: ReturnType<typeof Twilio> | null = null;
  private verifyServiceSid: string | null = null;
  private enabled = false;
  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID || null;

    if (accountSid && authToken && this.verifyServiceSid) {
      this.client = Twilio(accountSid, authToken);
      this.enabled = true;
    } else {
      this.logger.warn(
        'Twilio not configured — OTPs will be logged to console in dev mode',
      );
    }
  }
  async sendOTP(phone: string): Promise<{ sid?: string; status: string }> {
    if (!this.enabled || !this.client || !this.verifyServiceSid) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      this.logger.log(`[DEV] OTP for ${phone}: ${code}`);
      return { status: 'dev_mode', sid: `dev_${code}` };
    }
    const verification = await this.client.verify.v2
      .services(this.verifyServiceSid)
      .verifications.create({ to: phone, channel: 'sms' });
    return { sid: verification.sid, status: verification.status };
  }
  async verifyOTP(phone: string, code: string): Promise<{ valid: boolean }> {
    if (!this.enabled || !this.client || !this.verifyServiceSid) {
      this.logger.log(`[DEV] Verify OTP for ${phone}: ${code}`);
      return { valid: code.length === 6 && /^\d{6}$/.test(code) };
    }
    const check = await this.client.verify.v2
      .services(this.verifyServiceSid)
      .verificationChecks.create({ to: phone, code });
    return { valid: check.status === 'approved' };
  }
}
