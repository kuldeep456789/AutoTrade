import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SignOptions } from 'jsonwebtoken';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpStoreService } from './services/otp-store.service';

@Module({
  imports: [
    UsersModule,
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
  controllers: [AuthController],
  providers: [AuthService, OtpStoreService],
})
export class AuthModule {}
