import { config } from 'dotenv';
config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { Product } from '../modules/products/schemas/product.schema';
import { getCategoryInfoById } from '../modules/cj/collections';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const productModel = app.get<Model<Product>>('ProductModel');

  const products = await productModel.find({}).exec();
  console.log(`Found ${products.length} products to migrate`);

  let updatedCount = 0;
  for (const product of products) {
    const mapping = getCategoryInfoById(product.categoryId);

    if (mapping && mapping.subcategoryName) {
      if (
        product.subcategoryName !== mapping.subcategoryName ||
        product.gender !== mapping.gender ||
        product.collectionType !== mapping.collectionType
      ) {
        product.subcategoryName = mapping.subcategoryName;
        product.gender = mapping.gender;
        product.collectionType = mapping.collectionType;
        await product.save();
        updatedCount++;
      }
    }
  }
  console.log(`Migration completed. Updated ${updatedCount} products.`);
  await app.close();
}

bootstrap();
