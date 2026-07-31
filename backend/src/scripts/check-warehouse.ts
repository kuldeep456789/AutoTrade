import { Redis } from '@upstash/redis';
import { config } from 'dotenv';
config();

async function checkWarehouse() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error(
      '❌ UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing in .env',
    );
    process.exit(1);
  }

  const client = new Redis({ url, token });

  console.log('         UPSTASH REDIS WAREHOUSE REPORT           ');

  const getLength = (val: any): number => {
    if (!val) return 0;
    if (Array.isArray(val)) return val.length;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        return 0;
      }
    }
    return 0;
  };

  // ── Warehouse Counts ──────────────────────────────────────────────────────
  const [allVal] = await Promise.all([client.get<any>('products:all')]);

  const allCount = getLength(allVal);

  console.log('\n📦 WAREHOUSE TOTALS');
  console.log(`  All:     ${allCount} products`);

  // ── Per-Category Keys ─────────────────────────────────────────────────────
  const catKeys = (await client.keys('products:*:*')) || [];
  const currentCatKeys = catKeys.filter(
    (k) => !k.includes(':next:') && !['products:all'].includes(k),
  );

  if (currentCatKeys.length > 0) {
    console.log('\n📂 PER-CATEGORY BREAKDOWN');

    const catCounts: { key: string; count: number }[] = [];
    for (const key of currentCatKeys) {
      const val = await client.get<any>(key);
      const count = getLength(val);
      catCounts.push({ key, count });
    }

    catCounts.sort((a, b) => a.key.localeCompare(b.key));

    for (const { key, count } of catCounts) {
      const label = key.replace('products:', '').padEnd(30, '.');
      console.log(`  ${label} ${count} items`);
    }
  } else {
    console.log(
      '\n📂 PER-CATEGORY KEYS: none yet (warehouse is empty or sync has not run)',
    );
  }
}

checkWarehouse().catch((err) => {
  console.error(err);
  process.exit(1);
});
