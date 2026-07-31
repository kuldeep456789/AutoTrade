import {
  BadRequestException,
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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly otpStore: OtpStoreService,
  ) {}

  private validateAdminSecret(adminSecret?: string): { isProvided: boolean; isValid: boolean } {
    const validSecret = (process.env.ADMIN_SECRET_CODE || 'secret_admin_123').trim();
    const provided = adminSecret?.trim();

    if (provided && provided !== '') {
      if (provided !== validSecret) {
        throw new BadRequestException(
          'You entered an incorrect Admin Secret Code. Please enter the correct secret code to log in as an admin, or leave this field blank to log in as a regular user.',
        );
      }
      return { isProvided: true, isValid: true };
    }
    return { isProvided: false, isValid: false };
  }

  async register(registerDto: RegisterDto) {
    if (!registerDto.firstName || !registerDto.email || !registerDto.password) {
      throw new BadRequestException(
        'firstName, email, and password are required',
      );
    }
    if (registerDto.password.length < 6) {
      throw new BadRequestException('password must be at least 6 characters');
    }

    const { isProvided, isValid } = this.validateAdminSecret(registerDto.adminSecret);

    const name =
      `${registerDto.firstName} ${registerDto.lastName || ''}`.trim();
    const passwordHash = await bcrypt.hash(registerDto.password, 12);

    const role = (isProvided && isValid) ? 'admin' : 'customer';

    const user = await this.usersService.create(
      name,
      registerDto.email.toLowerCase(),
      passwordHash,
      undefined,
      role,
    );
    return this.authResponse(user);
  }

  async sendRegisterOtp(registerDto: RegisterDto) {
    if (!registerDto.firstName || !registerDto.email || !registerDto.password) {
      throw new BadRequestException(
        'firstName, email, and password are required',
      );
    }

    // Validate Admin Secret Code if provided (stops immediately & fails to send OTP if code is incorrect)
    this.validateAdminSecret(registerDto.adminSecret);

    const normalized = registerDto.email.toLowerCase().trim();
    const existingUser = await this.usersService.findByEmail(normalized);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const code = this.otpStore.generate(`register:${normalized}`);

    this.logger.log(`[DEV MODE] Registration OTP for ${normalized}: ${code}`);

    await this.mailService.sendOtp(registerDto.firstName, normalized, code);
    return { message: 'Registration OTP sent successfully' };
  }

  async verifyRegisterOtp(registerDto: RegisterDto, code: string) {
    const { isProvided, isValid } = this.validateAdminSecret(registerDto.adminSecret);

    const normalized = registerDto.email.toLowerCase().trim();
    if (!code) throw new BadRequestException('OTP is required');

    const valid = this.otpStore.verify(`register:${normalized}`, code);
    if (!valid) throw new BadRequestException('Invalid or expired OTP');

    this.otpStore.markVerified(`register_verified:${normalized}`);

    // Create the user now
    const name =
      `${registerDto.firstName} ${registerDto.lastName || ''}`.trim();
    const passwordHash = await bcrypt.hash(registerDto.password, 12);

    const role = (isProvided && isValid) ? 'admin' : 'customer';

    const user = await this.usersService.create(
      name,
      normalized,
      passwordHash,
      undefined,
      role,
    );

    // Send Welcome Email
    await this.mailService.sendWelcome(registerDto.firstName, normalized);

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

      const isValid = authenticator.verify({
        token: code,
        secret: user.twoFactorSecret,
      });

      if (!isValid) {
        throw new BadRequestException('Invalid authentication code');
      }

      return this.authResponse(this.usersService.toSafeUser(user));
    } catch (error) {
      throw new UnauthorizedException('Session expired or invalid. Please login again.');
    }
  }


  async sendEmailOtp(email: string) {
    if (!email) throw new BadRequestException('Email is required');
    const normalized = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalized);
    if (!user)
      throw new BadRequestException('No account found with this email');
    const code = this.otpStore.generate(`email:${normalized}`);
    await this.mailService.sendForgotPassword(user.firstName, normalized, code);
    return { message: 'OTP sent successfully' };
  }

  async verifyEmailOtp(email: string, code: string) {
    if (!email || !code)
      throw new BadRequestException('Email and OTP are required');
    const normalized = email.toLowerCase().trim();
    const valid = this.otpStore.verify(`email:${normalized}`, code);
    if (!valid) throw new BadRequestException('Invalid or expired OTP');
    this.otpStore.markVerified(`email_verified:${normalized}`);
    return { message: 'OTP verified successfully', verified: true };
  }

  async resetPassword(email: string, password: string) {
    if (!email || !password)
      throw new BadRequestException('Email and new password are required');
    if (password.length < 6)
      throw new BadRequestException('Password must be at least 6 characters');
    const normalized = email.toLowerCase().trim();
    const verified = this.otpStore.isVerified(`email_verified:${normalized}`);
    if (!verified)
      throw new BadRequestException(
        'OTP not verified. Please verify OTP first.',
      );
    const user = await this.usersService.findByEmail(normalized);
    if (!user)
      throw new BadRequestException('No account found with this email');
    await this.usersService.updatePassword(user.id, password);
    this.otpStore.invalidate(`email_verified:${normalized}`);
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
    const otpauthUrl = authenticator.keyuri(email, 'AutoTrade', secret);
    const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);
    return { secret, qrCodeUrl };
  }

  async enable2FA(userId: string, secret: string, code: string) {
    const isValid = authenticator.verify({ token: code, secret });
    if (!isValid) {
      throw new BadRequestException('Invalid authentication code');
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
