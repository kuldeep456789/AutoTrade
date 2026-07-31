import { Redis } from '@upstash/redis';
import { config } from 'dotenv';
config();

async function checkFields() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const client = new Redis({ url, token });

  const keys = await client.keys('products:*:*') || [];
  for (const key of keys.slice(0, 5)) {
    const val = await client.get<any>(key);
    if (val && Array.isArray(val) && val.length > 0) {
      const first = val[0];
      console.log(`Key: ${key}`);
      console.log(`  Name: ${first.name || first.title || first.productName}`);
      console.log(`  collectionType: ${first.collectionType}`);
      console.log(`  _collectionType: ${first._collectionType}`);
      console.log(`  parentCategory: ${first.parentCategory}`);
      console.log(`  _parentCategory: ${first._parentCategory}`);
      console.log(`  categoryName: ${first.categoryName}`);
      console.log(`  category: ${first.category}`);
      console.log(`  _category: ${first._category}`);
    }
  }
}
checkFields().catch(console.error);
