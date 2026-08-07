import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Enable2FaDto } from './dto/enable-2fa.dto';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('send-register-otp')
  sendRegisterOtp(@Body() registerDto: RegisterDto, @Req() req: any) {
    return this.authService.sendRegisterOtp(registerDto, req.ip, req.headers['user-agent']);
  }

  @Post('verify-register-otp')
  verifyRegisterOtp(@Body() body: { registerDto: RegisterDto; code: string }, @Req() req: any) {
    if (!body?.registerDto || !body?.code) {
      throw new BadRequestException('registerDto and code are required');
    }
    return this.authService.verifyRegisterOtp(body.registerDto, body.code, req.ip, req.headers['user-agent']);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto, @Req() req: any) {
    return this.authService.login(loginDto, req.ip, req.headers['user-agent']);
  }

  @Post('login/2fa')
  verify2FALogin(@Body() body: { tempToken: string; code: string }, @Req() req: any) {
    if (!body?.tempToken || !body?.code) {
      throw new BadRequestException('tempToken and code are required');
    }
    return this.authService.verify2FALogin(body.tempToken, body.code, req.ip, req.headers['user-agent']);
  }

  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    if (!body?.refreshToken) {
      throw new BadRequestException('refreshToken is required');
    }
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  async logout(@Headers('authorization') authorization?: string, @Req() req?: any) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Bearer token is required');
    const { user } = await this.authService.me(token);
    return this.authService.logout(user.id, user.email, req?.ip, req?.headers?.['user-agent']);
  }

  @Post('send-email-otp')
  sendEmailOtp(@Body() body: { email: string }, @Req() req: any) {
    if (!body?.email) throw new BadRequestException('email is required');
    return this.authService.sendEmailOtp(body.email, req.ip, req.headers['user-agent']);
  }

  @Post('verify-email-otp')
  verifyEmailOtp(@Body() body: { email: string; code: string }, @Req() req: any) {
    if (!body?.email || !body?.code) {
      throw new BadRequestException('email and code are required');
    }
    return this.authService.verifyEmailOtp(body.email, body.code, req.ip, req.headers['user-agent']);
  }

  @Post('reset-password')
  resetPassword(@Body() body: { email: string; password: string }, @Req() req: any) {
    if (!body?.email || !body?.password) {
      throw new BadRequestException('email and password are required');
    }
    return this.authService.resetPassword(body.email, body.password, req.ip, req.headers['user-agent']);
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return this.authService.me(token);
  }

  @Post('2fa/generate')
  async generate2FA(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Bearer token is required');
    const { user } = await this.authService.me(token);
    return this.authService.generate2FA(user.id, user.email);
  }

  @Post('2fa/enable')
  async enable2FA(
    @Headers('authorization') authorization?: string,
    @Body() dto?: Enable2FaDto,
  ) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Bearer token is required');
    if (!dto?.secret || !dto?.code)
      throw new BadRequestException('Secret and code are required');
    const { user } = await this.authService.me(token);
    return this.authService.enable2FA(user.id, dto.secret, dto.code);
  }

  @Post('2fa/disable')
  async disable2FA(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Bearer token is required');
    const { user } = await this.authService.me(token);
    return this.authService.disable2FA(user.id);
  }
}


