import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CjService } from '../modules/cj/cj.service';

async function bootstrap() {
  console.log(
    'Running Catalog Sync to refresh Redis warehouse keys with interleaved categories...',
  );
  const app = await NestFactory.createApplicationContext(AppModule);
  const cjService = app.get(CjService);

  try {
    const res = await cjService.runCatalogSync();
    console.log(
      `✅ Catalog sync finished: success=${res.success}, count=${res.count}`,
    );
  } catch (error) {
    console.error('❌ Catalog sync failed:', error);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
