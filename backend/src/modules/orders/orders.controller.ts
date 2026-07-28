import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  getOrders(@Headers('authorization') authorization?: string) {
    return this.ordersService.getOrders(this.requireToken(authorization));
  }

  @Get(':id')
  getOrder(
    @Headers('authorization') authorization: string | undefined,
    @Param('id') id: string,
  ) {
    const token = authorization?.replace(/^Bearer\s+/i, '');
    return this.ordersService.getOrder(token, id);
  }

  @Post()
  createOrder(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(
      this.requireToken(authorization),
      dto,
    );
  }

  private requireToken(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      throw new UnauthorizedException('Bearer token is required');
    }

    return token;
  }
}
