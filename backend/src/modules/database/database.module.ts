import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGODB_URI ?? 'mongodb://localhost:27017/aetherwear',
      {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        retryReads: true,
        maxPoolSize: 20,
        minPoolSize: 2,
        heartbeatFrequencyMS: 10000,
      },
    ),
  ],
})
export class DatabaseModule { }