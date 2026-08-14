import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private resend: any = null;
  private fromEmail = '';

  constructor() {
    const mailUser = process.env.MAIL_USER || process.env.SMTP_USER;
    const mailPass = process.env.MAIL_PASS || process.env.SMTP_PASS;
    const mailHost = process.env.SMTP_HOST || process.env.MAIL_HOST;
    const mailPort = process.env.SMTP_PORT || process.env.MAIL_PORT || 587;
    const mailSecure = process.env.SMTP_SECURE === 'true';

    this.fromEmail =
      process.env.MAIL_FROM ||
      process.env.FROM_EMAIL ||
      `AutoTrade <${mailUser || 'noreply@autotrade.com'}>`;

    if (mailUser && mailPass) {
      if (mailHost) {
        this.transporter = nodemailer.createTransport({
          host: mailHost,
          port: Number(mailPort),
          secure: mailSecure,
          auth: {
            user: mailUser.trim(),
            pass: mailPass.trim(),
          },
        });
        this.logger.log(
          `Nodemailer transport initialized for Custom SMTP: ${mailHost}:${mailPort}`,
        );
      } else {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: mailUser.trim(),
            pass: mailPass.trim(),
          },
        });
        this.logger.log(
          `Nodemailer transport initialized for Gmail account: ${mailUser}`,
        );
      }
    } else {
      this.logger.warn(
        'Nodemailer credentials (MAIL_USER / MAIL_PASS) not configured.',
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      import('resend')
        .then(({ Resend }) => {
          this.resend = new Resend(apiKey);
        })
        .catch((err) => {
          this.logger.error('Failed to import resend SDK', err);
        });
    }
  }

  getTemplatePath(templateName: string): string {
    return path.join(
      process.cwd(),
      'src',
      'modules',
      'mail',
      'templates',
      `${templateName}.html`,
    );
  }

  loadTemplate(
    templateName: string,
    variables: Record<string, any>,
  ): string {
    try {
      let html = fs.readFileSync(this.getTemplatePath(templateName), 'utf-8');
      for (const [key, value] of Object.entries(variables)) {
        html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      }
      return html;
    } catch (err) {
      if (templateName === 'otp' || templateName === 'forgot-password') {
        return `
            <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 480px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 16px;">
              <h2 style="color: #111; margin-bottom: 8px;">AutoTrade Verification</h2>
              <p style="color: #555; font-size: 14px;">Hello ${variables.name || 'User'},</p>
              <p style="color: #555; font-size: 14px;">Your 6-digit verification code is:</p>
              <div style="background: #f4f4f5; font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; padding: 16px; margin: 24px 0; border-radius: 12px; color: #111;">
                ${variables.otp}
              </div>
              <p style="color: #888; font-size: 12px;">This code is valid for ${variables.expiry || 10} minutes. Please do not share this code with anyone.</p>
            </div>
          `;
      }
      return '';
    }
  }

  private async sendEmail(to: string, subject: string, html: string) {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.fromEmail,
          to,
          subject,
          html,
        });

        this.logger.log(`Nodemailer sent email to ${to} (Subject: ${subject})`);
        return;
      } catch (err: any) {
        this.logger.error(
          `Nodemailer transport error sending to ${to}: ${err?.message}`,
        );
        throw err;
      }
    }

    this.logger.log(`[DEV EMAIL LOG] To: ${to}`);
    this.logger.debug(html);
  }

  private async sendEmailWithRetry(
    to: string,
    subject: string,
    html: string,
    maxRetries: number = 3,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.sendEmail(to, subject, html);
        this.logger.log(
          `[EMAIL] Sent successfully to ${to} (attempt ${attempt}/${maxRetries})`,
        );
        return;
      } catch (err: any) {
        this.logger.warn(
          `[EMAIL] Attempt ${attempt}/${maxRetries} failed for ${to}: ${err?.message}`,
        );
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    this.logger.error(`[EMAIL] All ${maxRetries} attempts failed for ${to}`);
  }

  async sendOtp(
    name: string,
    email: string,
    otp: string,
    expiry: string = '10',
  ) {
    const html = this.loadTemplate('otp', { name, otp, expiry });
    if (!html) return;
    await this.sendEmailWithRetry(email, 'Your AutoTrade Verification Code', html);
  }

  async sendWelcome(name: string, email: string) {
    const html = this.loadTemplate('welcome', { name });
    if (!html) return;
    await this.sendEmailWithRetry(email, 'Welcome to AutoTrade!', html);
  }

  async sendForgotPassword(
    name: string,
    email: string,
    otp: string,
    expiry: string = '10',
  ) {
    const html = this.loadTemplate('forgot-password', { name, otp, expiry });
    if (!html) return;
    await this.sendEmailWithRetry(email, 'Reset your AutoTrade password', html);
  }

  async sendOrderConfirmation(
    name: string,
    email: string,
    orderId: string,
    amount: string,
  ) {
    const html = this.loadTemplate('order-confirmation', {
      name,
      orderId,
      amount,
    });
    if (!html) return;
    await this.sendEmailWithRetry(
      email,
      `Order Confirmation - #${orderId}`,
      html,
    );
  }

  async sendPaymentSuccess(
    name: string,
    email: string,
    orderId: string,
    amount: string,
  ) {
    const html = this.loadTemplate('payment-success', {
      name,
      orderId,
      amount,
    });
    if (!html) return;
    await this.sendEmailWithRetry(
      email,
      `Payment Received - #${orderId}`,
      html,
    );
  }

  async sendOrderShipped(
    name: string,
    email: string,
    orderId: string,
    trackingLink: string,
  ) {
    const html = this.loadTemplate('shipped', { name, orderId, trackingLink });
    if (!html) return;
    await this.sendEmailWithRetry(
      email,
      `Your order #${orderId} has shipped!`,
      html,
    );
  }

  async sendOrderDelivered(name: string, email: string, orderId: string) {
    const html = this.loadTemplate('delivered', { name, orderId });
    if (!html) return;
    await this.sendEmailWithRetry(
      email,
      `Your order #${orderId} has been delivered`,
      html,
    );
  }

  async sendRefund(
    name: string,
    email: string,
    orderId: string,
    amount: string,
  ) {
    const html = this.loadTemplate('refund', { name, orderId, amount });
    if (!html) return;
    await this.sendEmailWithRetry(
      email,
      `Refund Processed - #${orderId}`,
      html,
    );
  }

  async sendSystemAlert(subject: string, message: string) {
    const to = process.env.ADMIN_ALERT_EMAIL || 't00368258@gmail.com';
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #fda4af; border-radius: 16px; background-color: #fff1f2;">
          <h2 style="color: #be123c; margin-bottom: 8px;">AutoTrade System Alert</h2>
          <p style="color: #333; font-size: 14px; font-weight: bold;">Subject: ${subject}</p>
          <p style="color: #555; font-size: 14px;">${message}</p>
          <hr style="border: 0; border-top: 1px solid #fda4af; margin: 20px 0;" />
          <p style="color: #9f1239; font-size: 11px;">This is an automated alert generated by the AutoTrade Backend service.</p>
        </div>
      `;
    await this.sendEmailWithRetry(to, subject, html);
  }
}
