const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: 'https://rational-elephant-222054.upstash.io',
  token: 'gQAAAAAAA2NmAAIgcDJkODU0MmE3YzkwODY0YTg4YjY3MWMzZDVjNjkyNmU3Mg',
});

async function run() {
  try {
    const keys = await redis.keys('*');
    console.log(`Total keys found: ${keys.length}`);
    
    let totalProducts = 0;
    
    for (const key of keys) {
      if (key.includes('product') || key.includes('categor')) {
        const data = await redis.get(key);
        let count = -1;
        if (Array.isArray(data)) {
            count = data.length;
        } else if (data && data.products) {
            count = data.products.length;
        } else if (data && data.data && Array.isArray(data.data)) {
            count = data.data.length;
        } else if (data && data.items && Array.isArray(data.items)) {
            count = data.items.length;
        }
        
        console.log(`Key: ${key} -> Items count: ${count}`);
      }
    }
  } catch(e) {
    console.error(e);
  }
}
run();
