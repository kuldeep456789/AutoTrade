import { Redis } from '@upstash/redis';
import { config } from 'dotenv';
config();

async function flushQueryCache() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error(
      '❌ UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing in .env',
    );
    process.exit(1);
  }

  const client = new Redis({ url, token });

  const keys = (await client.keys('cj:products:list:*')) || [];
  console.log(
    `Found ${keys.length} query cache keys to clear in Upstash Redis.`,
  );

  for (const k of keys) {
    await client.del(k);
    console.log(`Cleared query cache key: ${k}`);
  }

  console.log('Query cache cleared successfully.');
}

flushQueryCache().catch(console.error);
