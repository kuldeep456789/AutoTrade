import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { WishlistService } from './wishlist.service';

@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  getWishlist(@Headers('authorization') authorization?: string) {
    return this.wishlistService.getWishlist(this.requireToken(authorization));
  }

  @Post('items')
  addItem(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: AddWishlistItemDto,
  ) {
    return this.wishlistService.addItem(this.requireToken(authorization), dto);
  }

  @Delete('items/:productId')
  removeItem(
    @Headers('authorization') authorization: string | undefined,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeItem(
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
