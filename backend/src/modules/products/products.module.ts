import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { CjModule } from '../cj/cj.module';
import { RedisModule } from '../redis/redis.module';
import { UsersModule } from '../users/users.module';

import { ProductsController } from './products.controller';
import { CollectionsController } from './collections.controller';
import { ProductsService } from './products.service';

import { Review, ReviewSchema } from './schemas/review.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    CjModule,
    RedisModule,
    UsersModule,

    JwtModule.register({
      secret: process.env.JWT_SECRET || 'development-jwt-secret',
      signOptions: {
        expiresIn: '7d',
      },
    }),

    MongooseModule.forFeature([
      {
        name: Review.name,
        schema: ReviewSchema,
      },
      {
        name: Order.name,
        schema: OrderSchema,
      },
    ]),
  ],

  controllers: [ProductsController, CollectionsController],

  providers: [ProductsService],

  exports: [ProductsService],
})
export class ProductsModule {}
