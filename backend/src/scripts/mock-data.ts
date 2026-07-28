import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RedisService } from '../modules/redis/redis.service';

async function bootstrap() {
  console.log('Starting Mock Data Injection...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const redisService = app.get(RedisService);

  const mockProducts = [
    {
      pid: 'mock-men-1',
      name: 'Mock Men T-Shirt',
      price: 29.99,
      images: ['https://via.placeholder.com/300x400?text=Men+T-Shirt'],
      categoryId: 'men-cat-1',
      categoryName: 'T-Shirts',
      subcategoryName: 'T-Shirts',
      gender: 'Men',
      _gender: 'men',
      category: 'T-Shirts',
      collectionType: 'Men',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Black', 'White'],
    },
    {
      pid: 'mock-women-1',
      name: 'Mock Women Dress',
      price: 49.99,
      images: ['https://via.placeholder.com/300x400?text=Women+Dress'],
      categoryId: 'women-cat-1',
      categoryName: 'Dresses',
      subcategoryName: 'Dresses',
      gender: 'Women',
      _gender: 'women',
      category: 'Dresses',
      collectionType: 'Women',
      sizes: ['S', 'M', 'L'],
      colors: ['Red', 'Blue'],
    },
  ];

  try {
    const WAREHOUSE_TTL = 90 * 60;

    const menProducts = mockProducts.filter((p) => p.gender === 'Men');
    const womenProducts = mockProducts.filter((p) => p.gender === 'Women');

    await redisService.setJson('products:all', mockProducts, WAREHOUSE_TTL);
    await redisService.setJson('products:men', menProducts, WAREHOUSE_TTL);
    await redisService.setJson('products:women', womenProducts, WAREHOUSE_TTL);

    await redisService.setJson(
      'products:warehouse:all',
      mockProducts,
      WAREHOUSE_TTL,
    );
    await redisService.setJson(
      'products:warehouse:men',
      menProducts,
      WAREHOUSE_TTL,
    );
    await redisService.setJson(
      'products:warehouse:women',
      womenProducts,
      WAREHOUSE_TTL,
    );

    await redisService.setJson(
      'cj:sync:metrics',
      {
        status: 'success',
        lastSyncTime: new Date().toISOString(),
        productCount: mockProducts.length,
        menCount: menProducts.length,
        womenCount: womenProducts.length,
        lastSyncDurationMs: 1234,
        apiCallsUsed: 0,
        nextSyncIn: '60 minutes',
        error: null,
      },
      WAREHOUSE_TTL,
    );

    console.log('✅ Successfully injected mock products into Redis.');
  } catch (error) {
    console.error('❌ Failed to inject mock data:', error);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
