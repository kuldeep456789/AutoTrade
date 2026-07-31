import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Post('login/2fa')
  verify2FALogin(@Body() body: { tempToken: string; code: string }) {
    return this.authService.verify2FALogin(body.tempToken, body.code);
  }

  @Post('2fa/generate')
  async generate2FA(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Bearer token is required');
    const { user } = await this.authService.me(token);
    return this.authService.generate2FA(user._id, user.email);
  }

  @Post('2fa/enable')
  async enable2FA(
    @Headers('authorization') authorization?: string,
    @Body() body?: { secret: string; code: string },
  ) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Bearer token is required');
    if (!body?.secret || !body?.code) throw new BadRequestException('Secret and code are required');
    const { user } = await this.authService.me(token);
    return this.authService.enable2FA(user._id, body.secret, body.code);
  }

  @Post('2fa/disable')
  async disable2FA(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Bearer token is required');
    const { user } = await this.authService.me(token);
    return this.authService.disable2FA(user._id);
  }
}
