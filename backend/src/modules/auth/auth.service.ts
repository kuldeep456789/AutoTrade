import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService, SafeUser } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TwilioService } from './services/twilio.service';
import { MailService } from '../mail/mail.service';
import { OtpStoreService } from './services/otp-store.service';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly twilioService: TwilioService,
    private readonly mailService: MailService,
    private readonly otpStore: OtpStoreService,
  ) {}
  async register(registerDto: RegisterDto) {
    if (!registerDto.firstName || !registerDto.email || !registerDto.password) {
      throw new BadRequestException(
        'firstName, email, and password are required',
      );
    }
    if (registerDto.password.length < 6) {
      throw new BadRequestException('password must be at least 6 characters');
    }
    const name =
      `${registerDto.firstName} ${registerDto.lastName || ''}`.trim();
    const passwordHash = await bcrypt.hash(registerDto.password, 12);

    let role = 'customer';
    if (
      registerDto.adminSecret &&
      process.env.ADMIN_SECRET_CODE &&
      registerDto.adminSecret === process.env.ADMIN_SECRET_CODE
    ) {
      role = 'admin';
    }

    const user = await this.usersService.create(
      name,
      registerDto.email.toLowerCase(),
      passwordHash,
      registerDto.phone,
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
    const normalized = registerDto.email.toLowerCase().trim();
    const existingUser = await this.usersService.findByEmail(normalized);
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const code = this.otpStore.generate(`register:${normalized}`);

    // DEV HELPER: Log OTP to the backend terminal so you can test easily without waiting for emails
    console.log(`\n=========================================`);
    console.log(`[DEV MODE] Registration OTP for ${normalized}: ${code}`);
    console.log(`=========================================\n`);

    await this.mailService.sendOtp(registerDto.firstName, normalized, code);
    return { message: 'Registration OTP sent successfully' };
  }

  async verifyRegisterOtp(registerDto: RegisterDto, code: string) {
    const normalized = registerDto.email.toLowerCase().trim();
    if (!code) throw new BadRequestException('OTP is required');

    const valid = this.otpStore.verify(`register:${normalized}`, code);
    if (!valid) throw new BadRequestException('Invalid or expired OTP');

    this.otpStore.markVerified(`register_verified:${normalized}`);

    // Create the user now
    const name =
      `${registerDto.firstName} ${registerDto.lastName || ''}`.trim();
    const passwordHash = await bcrypt.hash(registerDto.password, 12);

    let role = 'customer';
    if (
      registerDto.adminSecret &&
      process.env.ADMIN_SECRET_CODE &&
      registerDto.adminSecret === process.env.ADMIN_SECRET_CODE
    ) {
      role = 'admin';
    }

    const user = await this.usersService.create(
      name,
      normalized,
      passwordHash,
      registerDto.phone,
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
    return this.authResponse(this.usersService.toSafeUser(user));
  }

  async adminSecretLogin(
    secretCode?: string,
    email?: string,
    password?: string,
  ) {
    const validSecret = process.env.ADMIN_SECRET_CODE || 'secret_admin_123';

    if (secretCode && secretCode.trim() === validSecret.trim()) {
      let adminUser = await this.usersService.findByEmail('admin@vastra.app');
      if (!adminUser) {
        const passwordHash = await bcrypt.hash('password123', 12);
        adminUser = await this.usersService.create(
          'System Admin',
          'admin@vastra.app',
          passwordHash,
          '+919999999999',
          'admin',
        );
      } else if (adminUser.role !== 'admin') {
        const fullUser =
          await this.usersService.findByEmailWithPassword('admin@vastra.app');
        if (fullUser) {
          fullUser.role = 'admin';
          await fullUser.save();
        }
        adminUser.role = 'admin';
      }
      return this.authResponse(adminUser);
    }

    if (email && password) {
      const user = await this.usersService.findByEmailWithPassword(
        email.toLowerCase().trim(),
      );
      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }
      const matches = await bcrypt.compare(password, user.password);
      if (!matches) {
        throw new UnauthorizedException('Invalid email or password');
      }
      if (user.role !== 'admin') {
        throw new UnauthorizedException(
          'Access denied. Administrator privileges required.',
        );
      }
      return this.authResponse(this.usersService.toSafeUser(user));
    }

    throw new BadRequestException('Invalid Admin Secret Code or credentials.');
  }

  async loginByPhone(phone: string) {
    const user = await this.usersService.findByPhone(phone);
    if (!user) {
      // Auto-create account for new phone numbers
      const email = `user_${phone.replace(/\D/g, '')}@vastra.app`;
      const passwordHash = await bcrypt.hash(Math.random().toString(36), 12);
      const doc = await this.usersService.create(
        'User',
        email,
        passwordHash,
        phone,
      );
      return this.authResponse(doc);
    }
    return this.authResponse(this.usersService.toSafeUser(user));
  }

  async sendMobileOtp(phone: string) {
    const normalized = phone.replace(/\s/g, '');
    if (!normalized || normalized.length < 10) {
      throw new BadRequestException('Valid phone number is required');
    }
    const result = await this.twilioService.sendOTP(normalized);
    if (result.status === 'dev_mode') {
      const code = result.sid?.replace('dev_', '') || '000000';
      this.otpStore.generate(`mobile:${normalized}`);
      this.otpStore.invalidate(`mobile:${normalized}`);
    }
    const code = this.otpStore.generate(`mobile:${normalized}`);
    if (result.status === 'dev_mode') {
      // In dev mode, store the generated code for verification
    }
    return { message: 'OTP sent successfully', reference: result.sid };
  }

  async verifyMobileOtp(phone: string, code: string) {
    const normalized = phone.replace(/\s/g, '');
    if (!normalized || !code) {
      throw new BadRequestException('Phone and OTP are required');
    }
    const twilioValid = await this.twilioService.verifyOTP(normalized, code);
    const storeValid = this.otpStore.verify(`mobile:${normalized}`, code);
    if (!twilioValid.valid && !storeValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    return this.loginByPhone(normalized);
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
