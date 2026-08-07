import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateReturnDto } from './dto/create-return.dto';
import { ReturnsService } from './returns.service';

@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  create(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateReturnDto,
  ) {
    return this.returnsService.create(this.requireToken(authorization), dto);
  }

  @Get()
  getMyReturns(@Headers('authorization') authorization?: string) {
    return this.returnsService.getMyReturns(this.requireToken(authorization));
  }

  @Get('all')
  getAll(@Headers('authorization') authorization?: string) {
    return this.returnsService.getAll(this.requireToken(authorization));
  }

  @Get(':id')
  getById(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
  ) {
    return this.returnsService.getById(this.requireToken(authorization), id);
  }

  @Patch(':id/status')
  updateStatus(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
    @Body() body: { status: string; adminRemarks?: string },
  ) {
    return this.returnsService.updateStatus(
      this.requireToken(authorization),
      id,
      body,
    );
  }

  private requireToken(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Bearer token is required');
    return token;
  }
}
