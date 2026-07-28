import mongoose from 'mongoose';
import { config } from 'dotenv';
config();

async function check() {
  const mongoUrl =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/aetherwear';
  console.log(`Connecting to MongoDB: ${mongoUrl}`);
  try {
    await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;

    if (!db) {
      console.error('Database connection not established.');
      return;
    }

    const totalCount = await db.collection('products').countDocuments();
    console.log(`\n🍃 Total Products in MongoDB: ${totalCount}`);

    const menCount = await db.collection('products').countDocuments({
      $or: [{ gender: 'men' }, { collectionType: 'Men' }],
    });

    const womenCount = await db.collection('products').countDocuments({
      $or: [{ gender: 'women' }, { collectionType: 'Women' }],
    });

    console.log(`👨 Men Products in DB: ${menCount}`);
    console.log(`👩 Women Products in DB: ${womenCount}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
}

check();
