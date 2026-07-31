import { BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { MailService } from '../mail/mail.service';
import { OtpStoreService } from './services/otp-store.service';

describe('AuthService', () => {
  let authService: AuthService;

  const usersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    findById: jest.fn(),
    toSafeUser: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mailService = {
    sendOtp: jest.fn(),
    sendWelcome: jest.fn(),
  };

  const otpStore = {
    generate: jest.fn(),
    verify: jest.fn(),
    isVerified: jest.fn(),
    markVerified: jest.fn(),
    invalidate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: MailService, useValue: mailService },
        { provide: OtpStoreService, useValue: otpStore },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('sendRegisterOtp', () => {
    it('throws ForbiddenException (403) when invalid admin secret is provided, without generating OTP or sending email', async () => {
      await expect(
        authService.sendRegisterOtp({
          firstName: 'John',
          email: 'john@example.com',
          password: 'password123',
          adminSecret: 'wrong_secret',
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(otpStore.generate).not.toHaveBeenCalled();
      expect(mailService.sendOtp).not.toHaveBeenCalled();
    });

    it('sends OTP for valid normal user registration', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      otpStore.generate.mockResolvedValue('123456');

      const result = await authService.sendRegisterOtp({
        firstName: 'John',
        email: 'john@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(otpStore.generate).toHaveBeenCalledWith('register:john@example.com');
      expect(mailService.sendOtp).toHaveBeenCalledWith('John', 'john@example.com', '123456');
    });
  });

  describe('login', () => {
    it('rejects invalid login credentials', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue({
        id: 'user-id',
        password: await bcrypt.hash('correct-password', 12),
      });

      await expect(
        authService.login({
          email: 'kuldeep@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
