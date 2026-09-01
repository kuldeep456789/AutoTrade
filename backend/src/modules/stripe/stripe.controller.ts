import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { StripeService } from './stripe.service';

@Controller('payments')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('create-checkout-session')
  createCheckoutSession(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.stripeService.createCheckoutSession(
      this.requireToken(authorization),
      dto,
    );
  }

  @Post('webhook')
  async webhook(
    @Headers('stripe-signature') signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const body: any = req.body;
    const payload: Buffer = Buffer.isBuffer(body)
      ? body
      : Buffer.from(String(body ?? ''), 'utf-8');
    return this.stripeService.handleWebhook(signature, payload);
  }

  @Get('success')
  async success(
    @Query('session_id') sessionId: string | undefined,
    @Res() res: Response,
  ) {
    const orderId = await this.stripeService.confirmSuccess(sessionId || '');
    const frontendBase =
      process.env.FRONTEND_URL?.replace(/\/+$/, '') ||
      (process.env.NODE_ENV === 'production'
        ? 'https://auto-trade-amber.vercel.app'
        : 'http://127.0.0.1:5173');

    if (orderId) {
      return res.redirect(302, `${frontendBase}/order/${orderId}`);
    }

    return res.redirect(302, `${frontendBase}/cart`);
  }

  @Get('cancel')
  cancel(@Res() res: Response) {
    const frontendBase =
      process.env.FRONTEND_URL?.replace(/\/+$/, '') ||
      (process.env.NODE_ENV === 'production'
        ? 'https://auto-trade-amber.vercel.app'
        : 'http://127.0.0.1:5173');
    return res.redirect(302, `${frontendBase}/cart`);
  }

  private requireToken(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      throw new UnauthorizedException('Bearer token is required');
    }

    return token;
  }
}