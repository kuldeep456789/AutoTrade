import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { SignOptions } from 'jsonwebtoken';
import { User, UserSchema } from './schemas/user.schema';
import { UserActivityLog, UserActivityLogSchema } from './schemas/user-activity-log.schema';
import { UsersService } from './users.service';
import { UserActivityLogService } from './user-activity-log.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserActivityLog.name, schema: UserActivityLogSchema }
    ]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'development-jwt-secret',
        signOptions: {
          expiresIn: (process.env.JWT_EXPIRES_IN ??
            '7d') as SignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, UserActivityLogService],
  exports: [UsersService, UserActivityLogService],
})
export class UsersModule {}
