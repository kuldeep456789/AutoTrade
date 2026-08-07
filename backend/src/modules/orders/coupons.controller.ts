import {
  Body,
  Controller,
  Get,
  Post,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon, CouponDocument } from '../admin/schemas/coupon.schema';

@Controller('coupons')
export class CouponsController {
  constructor(
    @InjectModel(Coupon.name) private readonly couponModel: Model<CouponDocument>,
  ) {}

  @Get('active')
  async getActiveCoupons() {
    const now = new Date();
    const coupons = await this.couponModel
      .find({
        isActive: true,
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
      })
      .lean()
      .exec();

    return { coupons };
  }

  @Post('validate')
  async validateCoupon(@Body() body: { code: string; orderAmount?: number }) {
    const code = (body.code || '').trim().toUpperCase();
    if (!code) throw new BadRequestException('Coupon code is required');

    const coupon = await this.couponModel.findOne({ code, isActive: true }).exec();
    if (!coupon) throw new NotFoundException('Invalid or inactive coupon code');

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new BadRequestException('Coupon code has expired');
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    const orderAmount = Number(body.orderAmount || 0);
    if (coupon.minOrderAmount && orderAmount < coupon.minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`,
      );
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((orderAmount * coupon.discountValue) / 100);
    } else {
      discountAmount = Math.round(coupon.discountValue);
    }

    return {
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      minOrderAmount: coupon.minOrderAmount,
      message: `Coupon '${coupon.code}' applied successfully!`,
    };
  }
}
