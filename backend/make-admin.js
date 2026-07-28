const mongoose = require('mongoose');

async function makeAdmin() {
  await mongoose.connect('mongodb://localhost:27017/Autotrade');
  const db = mongoose.connection;
  
  const result = await db.collection('users').updateOne(
    { email: 'admin@autotrade.app' },
    { $set: { role: 'admin' } }
  );
  
  console.log('Modified:', result.modifiedCount);
  await mongoose.disconnect();
}

makeAdmin().catch(console.error);
