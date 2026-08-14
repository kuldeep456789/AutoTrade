import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService, SafeUser } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailService } from '../mail/mail.service';
import { OtpStoreService } from './services/otp-store.service';
import { RedisService } from '../redis/redis.service';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { validatePassword } from '../../common/validators/password.validator';
import { UserActivityLogService } from '../users/user-activity-log.service';
import { EventType, RegistrationStatus, VerificationStatus } from '../users/schemas/user-activity-log.schema';

import { SettingsService } from '../settings/settings.service';

interface FailEntry {
  count: number;
  firstFailAt: number;
  lockedUntil?: number;
}

const ADMIN_SECRET_RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 15 * 60_000,
  LOCK_MS: 30 * 60_000,
};

const LOGIN_RATE_LIMIT = {
  MAX_ATTEMPTS: 5,
  WINDOW_MS: 15 * 60_000,
  LOCK_MS: 15 * 60_000,
};

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const TWO_FA_TEMP_TOKEN_TTL = '5m';
const EMAIL_DEDUP_TTL = 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly adminSecretFailures = new Map<string, FailEntry>();
  private readonly loginFailures = new Map<string, FailEntry>();
  private readonly refreshTokenStore = new Map<string, { hash: string; expiresAt: number }>();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly otpStore: OtpStoreService,
    private readonly activityLogService: UserActivityLogService,
    @Optional() private readonly redisService?: RedisService,
    @Optional() private readonly settingsService?: SettingsService,
  ) { }

  private async dedupEmail(key: string): Promise<boolean> {
    if (!this.redisService?.isReady()) return false;
    const exists = await this.redisService.exists(`email:${key}`);
    if (exists) return true;
    await this.redisService.setJson(`email:${key}`, { sent: true }, EMAIL_DEDUP_TTL);
    return false;
  }

  private async fireAndForgetEmail(
    emailFn: () => Promise<void>,
    context: string,
  ): Promise<void> {
    try {
      await emailFn();
    } catch (err: any) {
      this.logger.error(`[EMAIL ERROR] ${context}: ${err?.message}`);
    }
  }

  private fireAndForgetOtp(name: string, email: string, otp: string): void {
    this.fireAndForgetEmail(
      () => this.mailService.sendOtp(name, email, otp),
      `OTP email to ${email}`,
    );
  }

  private fireAndForgetWelcome(name: string, email: string): void {
    this.fireAndForgetEmail(
      () => this.mailService.sendWelcome(name, email),
      `welcome email to ${email}`,
    );
  }

  // ─── Private: Admin Secret Validation ─────────────────────────────────────

  private async checkAdminSecret(
    adminSecret: string | undefined,
    email: string,
  ): Promise<{ isAdmin: boolean }> {
    const provided = adminSecret?.trim();
    if (!provided) return { isAdmin: false };

    const normalized = email.toLowerCase().trim();
    const entry = this.adminSecretFailures.get(normalized);
    const now = Date.now();

    if (entry?.lockedUntil && now < entry.lockedUntil) {
      const remainingMin = Math.ceil((entry.lockedUntil - now) / 60_000);
      throw new ForbiddenException(
        `Too many invalid Admin Secret Code attempts. Please try again in ${remainingMin} minute(s).`,
      );
    }

    let validSecret = (process.env.ADMIN_SECRET_CODE || 'secret_admin_123').trim();
    if (this.settingsService) {
      try {
        const settings = await this.settingsService.getSettings();
        if (settings?.adminSecretCode) {
          validSecret = settings.adminSecretCode.trim();
        }
      } catch (err: any) {
        // Fall back to env default
      }
    }

    const isCorrect = provided === validSecret;

    if (!isCorrect) {
      this.recordFailure(this.adminSecretFailures, normalized, now, ADMIN_SECRET_RATE_LIMIT);
      this.logger.warn(`Failed admin secret attempt for email=${normalized}. Provided length=${provided.length}`);
      throw new ForbiddenException(
        'Invalid Admin Secret Code. Leave the field blank to register as a regular user.',
      );
    }

    this.adminSecretFailures.delete(normalized);
    return { isAdmin: true };
  }

  // ─── Private: Shared Rate-Limit Helper ────────────────────────────────────

  private recordFailure(
    map: Map<string, FailEntry>,
    key: string,
    now: number,
    cfg: { MAX_ATTEMPTS: number; WINDOW_MS: number; LOCK_MS: number },
  ): void {
    const existing = map.get(key);

    if (!existing || now - existing.firstFailAt > cfg.WINDOW_MS) {
      map.set(key, { count: 1, firstFailAt: now });
      return;
    }

    const count = existing.count + 1;
    if (count >= cfg.MAX_ATTEMPTS) {
      map.set(key, { count, firstFailAt: existing.firstFailAt, lockedUntil: now + cfg.LOCK_MS });
      this.logger.warn(`Rate-limit triggered for key=${key} after ${count} failures.`);
    } else {
      map.set(key, { ...existing, count });
    }
  }

  private checkLoginLock(normalizedEmail: string): void {
    const entry = this.loginFailures.get(normalizedEmail);
    const now = Date.now();
    if (entry?.lockedUntil && now < entry.lockedUntil) {
      const remainingMin = Math.ceil((entry.lockedUntil - now) / 60_000);
      throw new ForbiddenException(
        `Too many failed login attempts. Please try again in ${remainingMin} minute(s).`,
      );
    }
  }

  // ─── Private: Token Helpers ────────────────────────────────────────────────

  private async issueTokens(user: SafeUser): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, { expiresIn: ACCESS_TOKEN_TTL });
    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, type: 'refresh' },
      { expiresIn: REFRESH_TOKEN_TTL },
    );

    const hash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000;

    if (this.redisService?.isReady()) {
      await this.redisService.setJson(`refresh:${user.id}`, { hash, expiresAt }, REFRESH_TOKEN_TTL_SECONDS);
    } else {
      this.refreshTokenStore.set(user.id, { hash, expiresAt });
    }

    return { accessToken, refreshToken };
  }

  private async getStoredRefreshHash(userId: string): Promise<{ hash: string; expiresAt: number } | null> {
    if (this.redisService?.isReady()) {
      return this.redisService.getJson(`refresh:${userId}`);
    }
    return this.refreshTokenStore.get(userId) || null;
  }

  private async clearRefreshToken(userId: string): Promise<void> {
    if (this.redisService?.isReady()) {
      await this.redisService.del(`refresh:${userId}`);
    } else {
      this.refreshTokenStore.delete(userId);
    }
  }

  private verifyToken(token: string): any {
    try {
      return this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'development-jwt-secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  // ─── Register (OTP flow) ───────────────────────────────────────────────────

  async sendRegisterOtp(registerDto: RegisterDto, ip?: string, userAgent?: string) {
    const { firstName, email, password, adminSecret, adminSecretCode } = registerDto;
    const providedSecret = adminSecretCode ?? adminSecret;

    if (!firstName?.trim() || !email?.trim() || !password) {
      throw new BadRequestException('firstName, email, and password are required.');
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      throw new BadRequestException(passwordCheck.message);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const { isAdmin } = await this.checkAdminSecret(providedSecret, normalizedEmail);

    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new BadRequestException('This email address is already registered.');
    }

    const code = await this.otpStore.generate(`register:${normalizedEmail}`);

    if (isAdmin) {
      await this.otpStore.markVerified(`admin_intent:${normalizedEmail}`);
    }

    this.logger.log(`[REGISTER_OTP] OTP generated for email=${normalizedEmail} role=${isAdmin ? 'admin' : 'customer'}.`);

    try {
      await this.mailService.sendOtp(firstName.trim(), normalizedEmail, code);
    } catch (err: any) {
      this.logger.error(`[REGISTER_OTP] Mail sending error for email=${normalizedEmail}: ${err?.message}`);
    }

    this.activityLogService.logEvent({
      email: normalizedEmail,
      userName: firstName,
      eventType: EventType.REGISTRATION_STARTED,
      registrationStatus: RegistrationStatus.IN_PROGRESS,
      verificationStatus: VerificationStatus.PENDING,
      ipAddress: ip,
      userAgent: userAgent,
    });

    return { success: true, message: 'OTP sent successfully. Please check your email.' };
  }

  async verifyRegisterOtp(registerDto: RegisterDto, code: string, ip?: string, userAgent?: string) {
    const { firstName, lastName, email, password } = registerDto;

    if (!email?.trim() || !code?.trim()) {
      throw new BadRequestException('Email and OTP code are required.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isValidOtp = await this.otpStore.verify(`register:${normalizedEmail}`, code.trim());

    if (!isValidOtp) {
      throw new BadRequestException('Invalid or expired OTP.');
    }

    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new BadRequestException('This email address is already registered.');
    }

    const wasAdminIntent = await this.otpStore.isVerified(`admin_intent:${normalizedEmail}`);
    await this.otpStore.invalidate(`admin_intent:${normalizedEmail}`);

    const passwordHash = await bcrypt.hash(password, 12);
    const fullName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ');

    const user = await this.usersService.create(
      fullName,
      normalizedEmail,
      passwordHash,
      undefined,
      wasAdminIntent ? 'admin' : 'customer',
    );

    const tokens = await this.issueTokens(user);

    this.logger.log(`[REGISTER] New user created email=${normalizedEmail} role=${user.role}.`);

    this.fireAndForgetWelcome(fullName, normalizedEmail);

    this.activityLogService.logEvent({
      userId: user.id || (user as any)._id?.toString(),
      email: normalizedEmail,
      userName: fullName,
      eventType: EventType.ACCOUNT_CREATED,
      registrationStatus: RegistrationStatus.COMPLETED,
      verificationStatus: VerificationStatus.VERIFIED,
      ipAddress: ip,
      userAgent: userAgent,
    });

    return { success: true, user, ...tokens };
  }

  // ─── Login ──────────────────────────────────────────────────────────────

  async login(loginDto: LoginDto, ip?: string, userAgent?: string) {
    const { email, password } = loginDto;
    const normalizedEmail = email.toLowerCase().trim();

    this.checkLoginLock(normalizedEmail);

    const userDoc = await this.usersService.findByEmailWithPassword(normalizedEmail);

    if (!userDoc) {
      this.recordFailure(this.loginFailures, normalizedEmail, Date.now(), LOGIN_RATE_LIMIT);
      this.activityLogService.logEvent({
        email: normalizedEmail,
        eventType: EventType.LOGIN_FAILED,
        ipAddress: ip,
        userAgent: userAgent,
        metadata: { reason: 'User not found' },
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isMatch = await bcrypt.compare(password, userDoc.password);
    if (!isMatch) {
      this.recordFailure(this.loginFailures, normalizedEmail, Date.now(), LOGIN_RATE_LIMIT);
      this.activityLogService.logEvent({
        email: normalizedEmail,
        userId: userDoc.id || userDoc._id?.toString(),
        userName: userDoc.name,
        eventType: EventType.LOGIN_FAILED,
        ipAddress: ip,
        userAgent: userAgent,
        metadata: { reason: 'Incorrect password' },
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    this.loginFailures.delete(normalizedEmail);

    if (userDoc.isTwoFactorEnabled) {
      const tempToken = await this.jwtService.signAsync(
        { sub: userDoc.id || userDoc._id?.toString(), purpose: '2fa-pending' },
        { expiresIn: TWO_FA_TEMP_TOKEN_TTL },
      );
      return { requiresTwoFactor: true, tempToken };
    }

    const safeUser = this.usersService.toSafeUser(userDoc);
    const tokens = await this.issueTokens(safeUser);

    this.logger.log(`[LOGIN] User logged in email=${normalizedEmail}.`);
    
    this.activityLogService.logEvent({
      email: normalizedEmail,
      userId: safeUser.id,
      userName: safeUser.name,
      eventType: EventType.LOGIN_SUCCESS,
      ipAddress: ip,
      userAgent: userAgent,
    });

    return { success: true, user: safeUser, ...tokens };
  }

  async verify2FALogin(tempToken: string, code: string, ip?: string, userAgent?: string) {
    const payload = this.verifyToken(tempToken);
    if (payload.purpose !== '2fa-pending') {
      throw new UnauthorizedException('Invalid token.');
    }

    const userDoc = await this.usersService.findByIdWithSecret(payload.sub);
    if (!userDoc?.twoFactorSecret) {
      throw new UnauthorizedException('Two-factor authentication is not set up.');
    }

    const isValid = authenticator.verify({ token: code, secret: userDoc.twoFactorSecret });
    if (!isValid) {
      throw new UnauthorizedException('Invalid two-factor code.');
    }

    const safeUser = this.usersService.toSafeUser(userDoc);
    const tokens = await this.issueTokens(safeUser);

    this.activityLogService.logEvent({
      email: userDoc.email,
      userId: safeUser.id,
      userName: safeUser.name,
      eventType: EventType.LOGIN_SUCCESS,
      ipAddress: ip,
      userAgent: userAgent,
      metadata: { '2fa': true }
    });

    return { success: true, user: safeUser, ...tokens };
  }

  // ─── Session ────────────────────────────────────────────────────────────

  async me(token: string) {
    const payload = this.verifyToken(token);
    if (payload.purpose === '2fa-pending') {
      throw new UnauthorizedException('Two-factor verification required.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new NotFoundException('User not found.');

    return { user };
  }

  async refreshToken(refreshToken: string) {
    const payload = this.verifyToken(refreshToken);
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const stored = await this.getStoredRefreshHash(payload.sub);
    if (!stored || Date.now() > stored.expiresAt) {
      throw new UnauthorizedException('Refresh token expired. Please log in again.');
    }

    const matches = await bcrypt.compare(refreshToken, stored.hash);
    if (!matches) {
      throw new UnauthorizedException('Refresh token has been revoked.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found.');

    const tokens = await this.issueTokens(user);
    return { success: true, ...tokens };
  }

  async logout(userId: string, email?: string, ip?: string, userAgent?: string) {
    await this.clearRefreshToken(userId);
    
    if (email) {
      this.activityLogService.logEvent({
        userId,
        email,
        eventType: EventType.LOGOUT,
        ipAddress: ip,
        userAgent: userAgent,
      });
    }
    
    return { success: true, message: 'Logged out successfully.' };
  }

  // ─── Email OTP / Password Reset ─────────────────────────────────────────

  async sendEmailOtp(email: string, ip?: string, userAgent?: string) {
    if (!email?.trim()) throw new BadRequestException('Email is required.');
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      // Do not reveal whether the account exists
      return { success: true, message: 'If the account exists, an OTP has been sent.' };
    }

    const code = await this.otpStore.generate(`email:${normalizedEmail}`);
    await this.mailService.sendOtp(user.firstName, normalizedEmail, code);

    this.activityLogService.logEvent({
      userId: user.id || (user as any)._id?.toString(),
      email: normalizedEmail,
      userName: user.name,
      eventType: EventType.PASSWORD_RESET_REQUESTED,
      ipAddress: ip,
      userAgent: userAgent,
    });

    return { success: true, message: 'If the account exists, an OTP has been sent.' };
  }

  async verifyEmailOtp(email: string, code: string, ip?: string, userAgent?: string) {
    if (!email?.trim() || !code?.trim()) {
      throw new BadRequestException('Email and OTP code are required.');
    }
    const normalizedEmail = email.toLowerCase().trim();

    const isValid = await this.otpStore.verify(`email:${normalizedEmail}`, code.trim());
    if (!isValid) throw new BadRequestException('Invalid or expired OTP.');

    await this.otpStore.markVerified(`email_verified:${normalizedEmail}`);

    return { success: true, message: 'OTP verified.' };
  }

  async resetPassword(email: string, password: string, ip?: string, userAgent?: string) {
    if (!email?.trim()) throw new BadRequestException('Email is required.');
    const normalizedEmail = email.toLowerCase().trim();

    const isAuthorized = await this.otpStore.isVerified(`email_verified:${normalizedEmail}`);
    if (!isAuthorized) {
      throw new ForbiddenException('Email verification is required before resetting password.');
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      throw new BadRequestException(passwordCheck.message);
    }

    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) throw new NotFoundException('User not found.');

    await this.usersService.updatePassword(user.id, password);
    await this.otpStore.invalidate(`email_verified:${normalizedEmail}`);
    await this.clearRefreshToken(user.id);

    this.logger.log(`[RESET_PASSWORD] Password reset for email=${normalizedEmail}.`);
    
    this.activityLogService.logEvent({
      userId: user.id || (user as any)._id?.toString(),
      email: normalizedEmail,
      userName: user.name,
      eventType: EventType.PASSWORD_RESET_COMPLETED,
      ipAddress: ip,
      userAgent: userAgent,
    });

    return { success: true, message: 'Password reset successfully. Please log in again.' };
  }

  // ─── Two-Factor Setup ───────────────────────────────────────────────────

  async generate2FA(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(email, 'AutoTrade', secret);
    const qrCode = await qrcode.toDataURL(otpauth);

    return { secret, qrCode };
  }

  async enable2FA(userId: string, secret: string, code: string) {
    if (!secret?.trim() || !code?.trim()) {
      throw new BadRequestException('Secret and authentication code are required.');
    }
    const cleanSecret = secret.trim().replace(/\s+/g, '');
    const cleanCode = code.trim().replace(/\D/g, '');

    if (cleanCode.length !== 6) {
      throw new BadRequestException('Please enter a valid 6-digit authentication code.');
    }

    authenticator.options = { window: 2 };
    const isValid =
      authenticator.check(cleanCode, cleanSecret) ||
      authenticator.verify({ token: cleanCode, secret: cleanSecret });

    if (!isValid) {
      throw new BadRequestException('Invalid authentication code. Please check your authenticator app code and try again.');
    }

    const userDoc = await this.usersService.findByIdWithSecret(userId);
    if (!userDoc) throw new NotFoundException('User not found.');

    userDoc.twoFactorSecret = cleanSecret;
    userDoc.isTwoFactorEnabled = true;
    await userDoc.save();

    return { success: true, message: 'Two-factor authentication enabled successfully.' };
  }

  async disable2FA(userId: string) {
    const userDoc = await this.usersService.findByIdWithSecret(userId);
    if (!userDoc) throw new NotFoundException('User not found.');

    userDoc.twoFactorSecret = undefined;
    userDoc.isTwoFactorEnabled = false;
    await userDoc.save();

    return { success: true, message: 'Two-factor authentication disabled.' };
  }
}

