const mongoose = require('mongoose');
const uri = 'mongodb+srv://telebot2004_db_user:q4j1A67y4mA8k84b@autotrade.buevcyb.mongodb.net/?appName=AutoTrade';

async function run() {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    
    // We don't have the models loaded so we can just use the connection db
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name).join(', '));
    
    if (collections.some(c => c.name === 'products')) {
        const count = await db.collection('products').countDocuments();
        console.log(`Total Products in DB: ${count}`);
        
        // Also let's check category counts
        const categoryCounts = await db.collection('products').aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } }
        ]).toArray();
        
        console.log('\nProducts by category:');
        for (const cat of categoryCounts) {
            console.log(`- ${cat._id || 'Uncategorized'}: ${cat.count}`);
        }
    }
  } catch(e) {
    console.error('Mongo error:', e);
  } finally {
    await mongoose.disconnect();
  }
}
run();
