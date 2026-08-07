import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '../redis/redis.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { SearchIndexService } from './search-index.service';
import { SearchRepository } from './search.repository';
import { SearchService } from './search.service';

@Module({
  imports: [
    RedisModule,
    MongooseModule.forFeature([
      {
        name: Product.name,
        schema: ProductSchema,
      },
    ]),
  ],
  providers: [SearchIndexService, SearchRepository, SearchService],
  exports: [SearchIndexService, SearchRepository, SearchService],
})
export class SearchModule {}
