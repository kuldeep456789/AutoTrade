const mongoose = require('mongoose');

async function migrate() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/autotrade';
  await mongoose.connect(uri);
  
  console.log('Connected to MongoDB');
  
  const db = mongoose.connection.db;
  
  const orderCollection = db.collection('orders');
  
  // Find how many to delete
  const count = await orderCollection.countDocuments({ paymentStatus: 'unpaid' });
  console.log(`Found ${count} unpaid orders.`);
  
  if (count > 0) {
    const result = await orderCollection.deleteMany({ paymentStatus: 'unpaid' });
    console.log(`Deleted ${result.deletedCount} unpaid orders.`);
  } else {
    console.log('No unpaid orders to delete.');
  }
  
  await mongoose.disconnect();
}

migrate().catch(console.error);
