import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { Cart } from './schemas/cart-item.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<Cart>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async getCart(token: string) {
    const user = await this.resolveUser(token);
    const cart = await this.getOrCreateCart(user.id);
    return { cart };
  }

  async addItem(token: string, dto: AddCartItemDto) {
    if (!dto.productId || !dto.quantity || dto.quantity < 1) {
      throw new BadRequestException('productId and quantity are required');
    }

    const user = await this.resolveUser(token);
    const cart = await this.getOrCreateCart(user.id);
    const existingItem = cart.items.find(
      (item) => item.productId === dto.productId,
    );

    if (existingItem) {
      existingItem.quantity += dto.quantity;
    } else {
      cart.items.push({ productId: dto.productId, quantity: dto.quantity });
    }

    await cart.save();
    return { cart };
  }

  async removeItem(token: string, productId: string) {
    if (!productId) {
      throw new BadRequestException('productId is required');
    }

    const user = await this.resolveUser(token);
    const cart = await this.getOrCreateCart(user.id);
    cart.items = cart.items.filter((item) => item.productId !== productId);
    await cart.save();
    return { cart };
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

  private async getOrCreateCart(userId: string) {
    const objectId = new Types.ObjectId(userId);
    return (
      (await this.cartModel.findOne({ userId: objectId }).exec()) ??
      (await this.cartModel.create({ userId: objectId, items: [] }))
    );
  }
}
