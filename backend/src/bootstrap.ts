import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';
import compression from 'compression';
import * as express from 'express';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers and Content Security Policy
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );

  // Response Compression
  app.use(compression());

  // Parse request payloads
  // Stripe webhook requires the raw JSON body to verify its signature, so it
  // must be parsed (as raw) BEFORE the global JSON parser consumes the stream.
  app.use(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' }),
  );
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.setGlobalPrefix('api');

  // Enforce DTO validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS Configuration
  const allowedOrigins = [
    'https://auto-trade-amber.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4173',
  ];
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/+$/, ''));
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const cleanOrigin = origin.replace(/\/+$/, '');
      if (
        allowedOrigins.includes(cleanOrigin) ||
        /\.vercel\.app$/.test(cleanOrigin) ||
        /^https?:\/\/localhost(:\d+)?$/.test(cleanOrigin) ||
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(cleanOrigin)
      ) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'ngrok-skip-browser-warning',
    ],
  });

  const config = new DocumentBuilder()
    .setTitle('AutoTrade API')
    .setDescription('API documentation for AutoTrade')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Optional: Swagger UI
  SwaggerModule.setup('api/docs', app, document);

  // Scalar Docs
  app.use(
    '/docs',
    apiReference({
      spec: {
        content: document,
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
