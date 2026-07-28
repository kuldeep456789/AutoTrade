import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { Wishlist } from './schemas/wishlist.schema';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(Wishlist.name) private readonly wishlistModel: Model<Wishlist>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async getWishlist(token: string) {
    const user = await this.resolveUser(token);
    const wishlist = await this.getOrCreateWishlist(user.id);
    return { wishlist };
  }

  async addItem(token: string, dto: AddWishlistItemDto) {
    if (!dto.productId) {
      throw new BadRequestException('productId is required');
    }

    const user = await this.resolveUser(token);
    const wishlist = await this.getOrCreateWishlist(user.id);

    if (!wishlist.productIds.includes(dto.productId)) {
      wishlist.productIds.push(dto.productId);
      await wishlist.save();
    }

    return { wishlist };
  }

  async removeItem(token: string, productId: string) {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }

    const user = await this.resolveUser(token);
    const wishlist = await this.getOrCreateWishlist(user.id);
    wishlist.productIds = wishlist.productIds.filter((id) => id !== productId);
    await wishlist.save();
    return { wishlist };
  }

  private async resolveUser(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      return user;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async getOrCreateWishlist(userId: string) {
    const objectId = new Types.ObjectId(userId);
    return (
      (await this.wishlistModel.findOne({ userId: objectId }).exec()) ??
      (await this.wishlistModel.create({ userId: objectId, productIds: [] }))
    );
  }
}
