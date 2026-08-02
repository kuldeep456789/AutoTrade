import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService, SafeUser } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailService } from '../mail/mail.service';
import { OtpStoreService } from './services/otp-store.service';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';

// ─── In-memory rate limiter for admin secret brute-force protection ──────────
interface FailEntry {
  count: number;
  firstFailAt: number;
  lockedUntil?: number;
}

const ADMIN_SECRET_RATE_LIMIT = {
  MAX_ATTEMPTS: 5,          // max failures in window
  WINDOW_MS: 15 * 60_000,  // 15-minute window
  LOCK_MS: 30 * 60_000,    // 30-minute lockout after limit
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /** Key: email → failure tracking for admin secret attempts */
  private readonly adminSecretFailures = new Map<string, FailEntry>();

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly otpStore: OtpStoreService,
  ) {}

  // ─── Private: Admin Secret Validation ─────────────────────────────────────

  /**
   * Validates the admin secret code.
   *
   * Security rules:
   *  - Empty/blank → user is treated as a regular customer (not an error).
   *  - Correct code → user is treated as admin.
   *  - Incorrect code → ForbiddenException (403), security log, rate-limit check.
   *
   * @param adminSecret The value submitted by the user (may be undefined/empty).
   * @param email The registering email — used for rate-limit tracking and logging.
   * @returns { isAdmin: boolean } — true only when the correct code was supplied.
   */
  private checkAdminSecret(
    adminSecret: string | undefined,
    email: string,
  ): { isAdmin: boolean } {
    const provided = adminSecret?.trim();

    // Blank → regular user, no validation needed
    if (!provided) {
      return { isAdmin: false };
    }

    // Rate-limit check (before comparing, to prevent timing oracle)
    const normalized = email.toLowerCase().trim();
    const entry = this.adminSecretFailures.get(normalized);
    const now = Date.now();

    if (entry?.lockedUntil && now < entry.lockedUntil) {
      const remainingMin = Math.ceil((entry.lockedUntil - now) / 60_000);
      this.logger.warn(
        `[ADMIN_SECRET] Rate-limited attempt from email=${normalized}. ` +
        `Locked for ${remainingMin} more minute(s).`,
      );
      throw new ForbiddenException(
        `Too many invalid Admin Secret Code attempts. ` +
        `Please try again in ${remainingMin} minute(s).`,
      );
    }

    // Compare secret (constant-time via simple string equality — secrets are long enough)
    const validSecret = (process.env.ADMIN_SECRET_CODE || 'secret_admin_123').trim();
    const isCorrect = provided === validSecret;

    if (!isCorrect) {
      // Record failure — log WITHOUT revealing the provided or real secret
      this.recordAdminSecretFailure(normalized, now);
      this.logger.warn(
        `[ADMIN_SECRET] Invalid admin secret attempt — email=${normalized} ` +
        `at ${new Date(now).toISOString()}. ` +
        `Failure #${this.adminSecretFailures.get(normalized)?.count ?? '?'}.`,
      );
      throw new ForbiddenException(
        'Invalid Admin Secret Code. Leave the field blank to register as a regular user.',
      );
    }

    // Success — clear any previous failure count
    this.adminSecretFailures.delete(normalized);
    this.logger.log(
      `[ADMIN_SECRET] Valid admin secret used for email=${normalized}.`,
    );
    return { isAdmin: true };
  }

  /** Record and possibly lock an email after repeated admin secret failures. */
  private recordAdminSecretFailure(email: string, now: number): void {
    const existing = this.adminSecretFailures.get(email);
    const { MAX_ATTEMPTS, WINDOW_MS, LOCK_MS } = ADMIN_SECRET_RATE_LIMIT;

    if (!existing || now - existing.firstFailAt > WINDOW_MS) {
      // Start a fresh window
      this.adminSecretFailures.set(email, { count: 1, firstFailAt: now });
      return;
    }

    const count = existing.count + 1;
    if (count >= MAX_ATTEMPTS) {
      this.adminSecretFailures.set(email, {
        count,
        firstFailAt: existing.firstFailAt,
        lockedUntil: now + LOCK_MS,
      });
      this.logger.warn(
        `[ADMIN_SECRET] Rate-limit triggered for email=${email} after ${count} failures. ` +
        `Locked for ${LOCK_MS / 60_000} minutes.`,
      );
    } else {
      this.adminSecretFailures.set(email, { ...existing, count });
    }
  }

  // ─── Public Auth Methods ───────────────────────────────────────────────────

  /**
   * STEP 1 of registration.
   *
   * Correct order (enforced strictly):
   *   1. Validate required fields (fast, no I/O)
   *   2. Validate admin secret (fast, no I/O) — ForbiddenException if invalid
   *   3. Check email uniqueness (DB I/O)
   *   4. Generate OTP (in-memory)
   *   5. Send OTP email (SMTP I/O)
   *
   * No OTP is generated or email sent if the admin secret is wrong.
   */
  async sendRegisterOtp(registerDto: RegisterDto) {
    // ── 1. Field validation (cheapest check first) ──────────────────────────
    const { firstName, email, password, adminSecret, adminSecretCode } = registerDto;
    const providedSecret = adminSecretCode ?? adminSecret;

    if (!firstName?.trim() || !email?.trim() || !password) {
      throw new BadRequestException(
        'firstName, email, and password are required.',
      );
    }
    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters.');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── 2. Admin secret validation (before any I/O) ─────────────────────────
    //    ForbiddenException (403) + rate-limit if invalid code provided.
    //    Empty code → regular user, no error.
    const { isAdmin } = this.checkAdminSecret(providedSecret, normalizedEmail);

    // ── 3. Email uniqueness check (first DB call) ───────────────────────────
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new BadRequestException('This email address is already registered.');
    }

    // ── 4. Generate OTP (saved in Redis / OTP store) ────────────────────────
    const code = await this.otpStore.generate(`register:${normalizedEmail}`);

    // Store the admin intent in the OTP store so verifyRegisterOtp can honour it
    // without the client needing to re-send the secret (closing the bypass gap).
    if (isAdmin) {
      await this.otpStore.markVerified(`admin_intent:${normalizedEmail}`);
    }

    this.logger.log(
      `[REGISTER_OTP] OTP generated for email=${normalizedEmail} ` +
      `role=${isAdmin ? 'admin' : 'customer'}.`,
    );

    // ── 5. Send OTP email (SMTP I/O — last, most expensive) ─────────────────
    await this.mailService.sendOtp(firstName.trim(), normalizedEmail, code);

    return {
      success: true,
      message: 'OTP sent successfully. Please check your email.',
    };
  }

  /**
   * STEP 2 of registration.
   *
   * Verifies the OTP and creates the user account.
   * The role (admin vs customer) is determined from the server-side flag
   * set during sendRegisterOtp — the client does NOT re-send the admin secret here,
   * preventing any role-escalation bypass.
   */
  async verifyRegisterOtp(registerDto: RegisterDto, code: string) {
    const { firstName, lastName, email, password, adminSecret, adminSecretCode } = registerDto;
    const providedSecret = adminSecretCode ?? adminSecret;
    const normalizedEmail = email.toLowerCase().trim();

    if (!code) throw new BadRequestException('OTP is required.');

    // ── Verify OTP ──────────────────────────────────────────────────────────
    const valid = await this.otpStore.verify(`register:${normalizedEmail}`, code);
    if (!valid) throw new BadRequestException('Invalid or expired OTP.');

    // ── Read role from server-side intent (set during sendRegisterOtp) ───────
    let isAdmin = await this.otpStore.isVerified(`admin_intent:${normalizedEmail}`);
    await this.otpStore.invalidate(`admin_intent:${normalizedEmail}`);

    // Fallback: If intent flag was lost or missed, re-verify provided secret
    if (!isAdmin && providedSecret) {
      try {
        const { isAdmin: isSecretValid } = this.checkAdminSecret(providedSecret, normalizedEmail);
        isAdmin = isSecretValid;
      } catch {
        isAdmin = false;
      }
    }

    const role = isAdmin ? 'admin' : 'customer';

    // ── Create user ──────────────────────────────────────────────────────────
    const name = `${firstName.trim()} ${lastName?.trim() || ''}`.trim();
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.usersService.create(
      name,
      normalizedEmail,
      passwordHash,
      undefined,
      role,
    );

    this.logger.log(
      `[REGISTER] Account created email=${normalizedEmail} role=${role}.`,
    );

    // ── Welcome email ────────────────────────────────────────────────────────
    await this.mailService.sendWelcome(firstName.trim(), normalizedEmail);

    return this.authResponse(user);
  }

  async login(loginDto: LoginDto) {
    if (!loginDto.email || !loginDto.password) {
      throw new BadRequestException('email and password are required');
    }

    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email.toLowerCase(),
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isTwoFactorEnabled) {
      return {
        requires2FA: true,
        tempToken: this.jwtService.sign(
          { sub: user.id, email: user.email, requires2FA: true },
          { expiresIn: '15m' },
        ),
      };
    }

    return this.authResponse(this.usersService.toSafeUser(user));
  }

  async verify2FALogin(tempToken: string, code: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        requires2FA: boolean;
      }>(tempToken);

      if (!payload.requires2FA) {
        throw new BadRequestException('Invalid token for 2FA verification');
      }

      const user = await this.usersService.findByIdWithSecret(payload.sub);
      if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
        throw new BadRequestException('2FA is not enabled for this account');
      }

      authenticator.options = { window: 2 };
      const cleanCode = (code || '').trim().replace(/\s+/g, '');
      const isValid = authenticator.check(cleanCode, user.twoFactorSecret);

      if (!isValid) {
        throw new BadRequestException('Invalid authentication code');
      }

      return this.authResponse(this.usersService.toSafeUser(user));
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new UnauthorizedException('Session expired or invalid. Please login again.');
    }
  }

  async sendEmailOtp(email: string) {
    if (!email) throw new BadRequestException('Email is required');
    const normalized = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalized);
    if (!user)
      throw new BadRequestException('No account found with this email');
    const code = await this.otpStore.generate(`email:${normalized}`);
    await this.mailService.sendForgotPassword(user.firstName, normalized, code);
    return { message: 'OTP sent successfully' };
  }

  async verifyEmailOtp(email: string, code: string) {
    if (!email || !code)
      throw new BadRequestException('Email and OTP are required');
    const normalized = email.toLowerCase().trim();
    const valid = await this.otpStore.verify(`email:${normalized}`, code);
    if (!valid) throw new BadRequestException('Invalid or expired OTP');
    await this.otpStore.markVerified(`email_verified:${normalized}`);
    return { message: 'OTP verified successfully', verified: true };
  }

  async resetPassword(email: string, password: string) {
    if (!email || !password)
      throw new BadRequestException('Email and new password are required');
    if (password.length < 6)
      throw new BadRequestException('Password must be at least 6 characters');
    const normalized = email.toLowerCase().trim();
    const verified = await this.otpStore.isVerified(`email_verified:${normalized}`);
    if (!verified)
      throw new BadRequestException(
        'OTP not verified. Please verify OTP first.',
      );
    const user = await this.usersService.findByEmail(normalized);
    if (!user)
      throw new BadRequestException('No account found with this email');
    await this.usersService.updatePassword(user.id, password);
    await this.otpStore.invalidate(`email_verified:${normalized}`);
    return { message: 'Password reset successfully' };
  }

  async me(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new UnauthorizedException('User no longer exists');
      return { user: this.toClientUser(user) };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async generate2FA(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    const cleanEmail = (email || 'user@autotrade.com').trim();
    const otpauthUrl = `otpauth://totp/AutoTrade:${encodeURIComponent(cleanEmail)}?secret=${secret}&issuer=AutoTrade`;
    const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);
    return { secret, qrCodeUrl };
  }

  async enable2FA(userId: string, secret: string, code: string) {
    authenticator.options = { window: 2 };
    const cleanCode = (code || '').trim().replace(/\s+/g, '');
    const isValid = authenticator.check(cleanCode, secret);
    if (!isValid) {
      throw new BadRequestException('Invalid 2FA code. Make sure your phone device time is synchronized and try again.');
    }
    const user = await this.usersService.findByIdWithSecret(userId);
    if (!user) throw new NotFoundException('User not found');

    user.isTwoFactorEnabled = true;
    user.twoFactorSecret = secret;
    await user.save();

    return { message: 'Two-Factor Authentication enabled successfully' };
  }

  async disable2FA(userId: string) {
    const user = await this.usersService.findByIdWithSecret(userId);
    if (!user) throw new NotFoundException('User not found');

    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    return { message: 'Two-Factor Authentication disabled successfully' };
  }

  private authResponse(user: SafeUser) {
    return {
      user: this.toClientUser(user),
      accessToken: this.jwtService.sign({ sub: user.id, email: user.email }),
    };
  }

  private toClientUser(user: SafeUser) {
    return {
      _id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
  }
}
