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
import { ChangePasswordDto } from './dto/change-password.dto';
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
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      return payload.sub;
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
  @Put('change-password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Headers('authorization') authorization?: string,
  ) {
    const userId = await this.extractUserId(authorization);
    await this.usersService.changePassword(userId, dto);
    return { message: 'Password changed successfully' };
  }
}
