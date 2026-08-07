import { Body, Controller, Get, Post, Put, Patch, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings() {
    const settings = await this.settingsService.getSettings();
    const doc = (settings as any)._doc || settings;
    return {
      ...doc,
      settings: doc,
    };
  }

  @Post()
  @Put()
  @Patch()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    const settings = await this.settingsService.updateSettings(dto);
    const doc = (settings as any)._doc || settings;
    return {
      success: true,
      message: 'Settings updated successfully',
      ...doc,
      settings: doc,
    };
  }
}
