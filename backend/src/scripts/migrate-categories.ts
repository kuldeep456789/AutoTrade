import { config } from 'dotenv';
config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { Product } from '../modules/products/schemas/product.schema';
import { getCategoryById } from '../modules/cj/collections';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const productModel = app.get<Model<Product>>('ProductModel');

  const products = await productModel.find({}).exec();
  console.log(`Found ${products.length} products to migrate`);

  let updatedCount = 0;
  for (const product of products) {
    const mapping = getCategoryById(product.categoryId);

    if (mapping) {
      const { parentCategory, item } = mapping;
      if (
        product.subcategoryName !== item.name ||
        product.collectionType !== parentCategory
      ) {
        product.subcategoryName = item.name;
        product.collectionType = parentCategory;
        await product.save();
        updatedCount++;
      }
    }
  }
  console.log(`Migration completed. Updated ${updatedCount} products.`);
  await app.close();
}

bootstrap();
