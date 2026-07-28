import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('send-register-otp')
  sendRegisterOtp(@Body() registerDto: RegisterDto) {
    return this.authService.sendRegisterOtp(registerDto);
  }

  @Post('verify-register-otp')
  verifyRegisterOtp(@Body() body: { registerDto: RegisterDto; code: string }) {
    return this.authService.verifyRegisterOtp(body.registerDto, body.code);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('admin-secret-login')
  adminSecretLogin(
    @Body() body: { secretCode?: string; email?: string; password?: string },
  ) {
    return this.authService.adminSecretLogin(
      body.secretCode,
      body.email,
      body.password,
    );
  }

  @Post('send-mobile-otp')
  sendMobileOtp(@Body() body: { phone: string }) {
    return this.authService.sendMobileOtp(body.phone);
  }

  @Post('verify-mobile-otp')
  verifyMobileOtp(@Body() body: { phone: string; code: string }) {
    return this.authService.verifyMobileOtp(body.phone, body.code);
  }

  @Post('send-email-otp')
  sendEmailOtp(@Body() body: { email: string }) {
    return this.authService.sendEmailOtp(body.email);
  }

  @Post('verify-email-otp')
  verifyEmailOtp(@Body() body: { email: string; code: string }) {
    return this.authService.verifyEmailOtp(body.email, body.code);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { email: string; password: string }) {
    return this.authService.resetPassword(body.email, body.password);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return this.authService.me(token);
  }
}
