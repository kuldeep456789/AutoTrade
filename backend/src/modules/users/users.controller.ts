import {
  Body,
  Controller,
  Get,
  Headers,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}
  private async extractUserId(authorization?: string): Promise<string> {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Bearer token is required');
    try {
      const payload = await this.jwtService.verifyAsync<any>(token, {
        secret: process.env.JWT_SECRET || 'development-jwt-secret',
      });
      const userId = payload.sub || payload.id || payload._id || payload.userId;
      if (!userId) throw new UnauthorizedException('Invalid token payload');
      return userId;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
  @Get('profile')
  async getProfile(@Headers('authorization') authorization?: string) {
    const userId = await this.extractUserId(authorization);
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return { user };
  }
  @Put('profile')
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.extractUserId(authorization);
    const user = await this.usersService.updateProfile(userId, dto);
    return { user };
  }

  @Put('admin-currency')
  async updateAdminCurrency(
    @Body('currency') currency: string,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.extractUserId(authorization);
    const validCurrencies = ['INR', 'USD', 'EUR', 'GBP'];
    if (!validCurrencies.includes(currency)) {
      throw new UnauthorizedException('Invalid currency');
    }
    const user = await this.usersService.findById(userId);
    if (!user || user.role !== 'admin') {
      throw new UnauthorizedException('Only admins can set this preference');
    }
    const updatedUser = await this.usersService.updateAdminCurrency(userId, currency);
    return { user: updatedUser };
  }
}
