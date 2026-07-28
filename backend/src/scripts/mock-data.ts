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
      pid: 'mock-auto-1',
      name: 'Mock Car Cover',
      price: 29.99,
      images: ['https://via.placeholder.com/300x400?text=Car+Cover'],
      categoryId: 'auto-cat-1',
      categoryName: 'Exterior Accessories',
      subcategoryName: 'Car Covers',
      category: 'Exterior Accessories',
      collectionType: 'Auto',
    },
    {
      pid: 'mock-auto-2',
      name: 'Mock Floor Mats',
      price: 49.99,
      images: ['https://via.placeholder.com/300x400?text=Floor+Mats'],
      categoryId: 'auto-cat-2',
      categoryName: 'Interior Accessories',
      subcategoryName: 'Floor Mats',
      category: 'Interior Accessories',
      collectionType: 'Auto',
    },
  ];

  try {
    const WAREHOUSE_TTL = 90 * 60;

    await redisService.setJson('products:all', mockProducts, WAREHOUSE_TTL);
    await redisService.setJson(
      'products:warehouse:all',
      mockProducts,
      WAREHOUSE_TTL,
    );

    await redisService.setJson(
      'cj:sync:metrics',
      {
        status: 'success',
        lastSyncTime: new Date().toISOString(),
        productCount: mockProducts.length,
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
