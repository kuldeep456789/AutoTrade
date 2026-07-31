import { Redis } from '@upstash/redis';
import { config } from 'dotenv';
config();

async function compileWarehouse() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error('❌ UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing in .env');
    process.exit(1);
  }

  const client = new Redis({ url, token });
  console.log('Compiling warehouse from subcategory keys...');

  const catKeys = await client.keys('products:*:*') || [];
  const currentCatKeys = catKeys.filter(
    (k) => !k.includes(':next:') && !['products:all'].includes(k),
  );

  let allProducts: any[] = [];
  for (const key of currentCatKeys) {
    const val = await client.get<any>(key);
    let list: any[] = [];
    if (Array.isArray(val)) {
      list = val;
    } else if (typeof val === 'string') {
      try {
        list = JSON.parse(val);
      } catch {}
    }
    if (Array.isArray(list)) {
      console.log(`Loaded ${list.length} products from ${key}`);
      allProducts.push(...list);
    }
  }

  // De-duplicate by PID
  const seen = new Set<string>();
  const uniqueProducts = allProducts.filter((p) => {
    const pid = String(p.pid || p.id || p._id || '');
    if (!pid || seen.has(pid)) return false;
    seen.add(pid);
    return true;
  });

  console.log(`Total loaded: ${allProducts.length}, Unique: ${uniqueProducts.length}`);

  // Strip down heavy fields to fit under Upstash's 10MB request payload limit
  const cleanProducts = uniqueProducts.map((p) => ({
    pid: String(p.pid || p.id || p._id || ''),
    name: p.name || p.title || '',
    title: p.title || p.name || '',
    price: Number(p.price || 0),
    images: Array.isArray(p.images) ? p.images.slice(0, 3) : (p.productImage ? [p.productImage] : []),
    category: p.category || p.categoryName || p._category || '',
    categoryId: p.categoryId || '',
    categoryName: p.categoryName || p.category || '',
    subcategoryName: p.subcategoryName || p._category || '',
    collectionType: p.collectionType || p._collectionType || '',
    _parentCategory: p._parentCategory || p.collectionType || '',
    _category: p._category || p.subcategoryName || '',
    _collectionType: p._collectionType || p.collectionType || '',
    averageRating: Number(p.averageRating || 0),
    numReviews: Number(p.numReviews || 0),
    sellPrice: p.sellPrice || ''
  }));

  const payloadString = JSON.stringify(cleanProducts);
  const payloadSizeMb = Buffer.byteLength(payloadString, 'utf8') / (1024 * 1024);
  console.log(`Cleaned payload size: ${payloadSizeMb.toFixed(2)} MB`);

  if (payloadSizeMb > 10) {
    console.error('❌ Payload size still exceeds 10MB! Splitting or additional stripping needed.');
    process.exit(1);
  }

  // Save to warehouse:all and products:all
  await client.set('warehouse:all', payloadString);
  await client.set('products:all', payloadString);
  await client.set('cj:product_count', cleanProducts.length);

  console.log('✅ Successfully compiled and saved warehouse:all & products:all');
}

compileWarehouse().catch(console.error);
