import { config } from 'dotenv';
config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RedisService } from '../modules/redis/redis.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const redisService = app.get(RedisService);

  const keys = await redisService.keys('products:*');
  for (const key of keys) {
    if (!key.includes('warehouse')) {
      await redisService.del(key);
      console.log('Deleted cache key:', key);
    }
  }
  console.log('API cache flushed in Upstash Redis.');

  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
