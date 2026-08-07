import { Body, Controller, Delete, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartService } from './cart.service';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @Get()
  getCart(@Headers('authorization') authorization?: string) {
    return this.cartService.getCart(this.requireToken(authorization));
  }

  @Post('items')
  addItem(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(this.requireToken(authorization), dto);
  }

  @Delete('items/:productId')
  removeItem(
    @Headers('authorization') authorization: string | undefined,
    @Param('productId') productId: string,
  ) {
    return this.cartService.removeItem(
      this.requireToken(authorization),
      productId,
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
