import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { User, UserSchema } from '../users/schemas/user.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import {
  ReturnRequest,
  ReturnRequestSchema,
} from '../returns/schemas/return.schema';
import { Coupon, CouponSchema } from './schemas/coupon.schema';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import { ActivityLog, ActivityLogSchema } from './schemas/activity-log.schema';
import { Settings, SettingsSchema } from './schemas/settings.schema';

import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';

import {
  CustomerIssue,
  CustomerIssueSchema,
} from './schemas/customer-issue.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: ReturnRequest.name, schema: ReturnRequestSchema },
      { name: Coupon.name, schema: CouponSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: Settings.name, schema: SettingsSchema },
      { name: CustomerIssue.name, schema: CustomerIssueSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'development-jwt-secret',
      }),
    }),
    UsersModule,
  ],
  controllers: [AdminController],
})
export class AdminModule {}
