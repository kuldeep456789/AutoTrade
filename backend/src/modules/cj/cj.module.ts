import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CjController } from './cj.controller';
import { CjService } from './cj.service';
import { CjCronService } from './cj.cron.service';
import { RedisModule } from '../redis/redis.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';

@Module({
  imports: [
    RedisModule,
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [CjController],
  providers: [CjService, CjCronService],
  exports: [CjService],
})
export class CjModule {}
