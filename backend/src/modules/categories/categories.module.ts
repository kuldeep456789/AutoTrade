import { Module } from '@nestjs/common';
import { CjModule } from '../cj/cj.module';
import { RedisModule } from '../redis/redis.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [CjModule, RedisModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
})
export class CategoriesModule {}
