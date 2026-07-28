import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CjService } from '../modules/cj/cj.service';

async function bootstrap() {
  console.log('Starting CJ Dropshipping 20k Product Sync Workflow...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const cjService = app.get(CjService);

  try {
    console.log(
      'Fetching products using Keyword Crawler (this will take several minutes)...',
    );
    const allProducts = await cjService.crawlAllByKeywords();
    console.log(
      `✅ Workflow Complete! Successfully fetched ${allProducts?.length || 0} products.`,
    );
  } catch (error) {
    console.error('❌ Workflow failed:', error);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
