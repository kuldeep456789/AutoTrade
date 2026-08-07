import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Get,
  Patch,
  Param,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ContactService } from './contact.service';
import { UsersService } from '../users/users.service';

@Controller('contact')
export class ContactController {
  constructor(
    private readonly contactService: ContactService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  async createMessage(
    @Body()
    body: {
      name: string;
      email: string;
      subject: string;
      message: string;
    },
  ) {
    if (!body.name || !body.email || !body.subject || !body.message) {
      throw new BadRequestException('All fields are required');
    }
    return this.contactService.createContactMessage(body);
  }

  @Get()
  async getMessages() {
    return this.contactService.findAll();
  }

  @Get('me')
  async getMyMessages(
    @Headers('authorization') authorization: string | undefined,
  ) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      throw new UnauthorizedException('Bearer token is required');
    }

    let user;
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      user = await this.usersService.findById(payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.contactService.findByEmail(user.email);
  }

  @Patch(':id/status')
  @Post(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    if (!body.status) {
      throw new BadRequestException('Status is required');
    }
    return this.contactService.updateStatus(id, body.status);
  }

  @Patch(':id/reply')
  @Post(':id/reply')
  async replyMessage(
    @Param('id') id: string,
    @Body() body: { adminReply: string; status?: string },
  ) {
    if (!body.adminReply) {
      throw new BadRequestException('Reply text is required');
    }
    return this.contactService.replyMessage(
      id,
      body.adminReply,
      body.status || 'resolved',
    );
  }
}
