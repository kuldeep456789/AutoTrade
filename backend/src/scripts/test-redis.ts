import { Redis } from '@upstash/redis';
import { config } from 'dotenv';
config();

async function testRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.error(
      '❌ UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing in .env',
    );
    process.exit(1);
  }

  console.log(`Connecting to Upstash Redis at ${url}...`);
  const redis = new Redis({ url, token });

  try {
    // Quick test
    await redis.set('test-key', 'working');
    const val = await redis.get<string>('test-key');
    console.log(`✅ Test key set & fetched successfully. Value: ${val}`);
    await redis.del('test-key');
    console.log(
      '✅ Successfully deleted test key. Upstash Redis is working perfectly!',
    );
  } catch (err) {
    console.error('❌ Failed to connect/operate on Upstash Redis:', err);
    process.exit(1);
  }
}

testRedis();
