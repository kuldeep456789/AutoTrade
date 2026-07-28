import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { TwilioService } from './services/twilio.service';
import { MailService } from '../mail/mail.service';
import { OtpStoreService } from './services/otp-store.service';

describe('AuthService', () => {
  let authService: AuthService;

  const usersService = {
    create: jest.fn(),
    findByEmailWithPassword: jest.fn(),
    findById: jest.fn(),
    toSafeUser: jest.fn(),
  };

  const jwtService = {
    sign: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const twilioService = {} as any;
  const mailService = {} as any;
  const otpStore = {} as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: TwilioService, useValue: twilioService },
        { provide: MailService, useValue: mailService },
        { provide: OtpStoreService, useValue: otpStore },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('registers a user and returns a token', async () => {
    usersService.create.mockResolvedValue({
      id: 'user-id',
      firstName: 'Kuldeep',
      lastName: '',
      name: 'Kuldeep',
      email: 'kuldeep@example.com',
      role: 'customer',
    });
    jwtService.sign.mockReturnValue('token');

    const response = await authService.register({
      firstName: 'Kuldeep',
      lastName: '',
      email: 'Kuldeep@Example.com',
      password: 'secret123',
    });

    expect(usersService.create).toHaveBeenCalledWith(
      'Kuldeep',
      'kuldeep@example.com',
      expect.any(String),
      undefined,
    );
    expect(response.accessToken).toBe('token');
  });

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
