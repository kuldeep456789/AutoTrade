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
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? [frontendUrl, /\.vercel\.app$/] : true,
    credentials: true,
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
