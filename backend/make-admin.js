const mongoose = require('mongoose');

async function makeAdmin() {
  await mongoose.connect('mongodb://localhost:27017/aetherwear');
  const db = mongoose.connection;
  
  const result = await db.collection('users').updateOne(
    { email: 'admin@vastra.app' },
    { $set: { role: 'admin' } }
  );
  
  console.log('Modified:', result.modifiedCount);
  await mongoose.disconnect();
}

makeAdmin().catch(console.error);
