import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { ValidationPipe } from '@nestjs/common';
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
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.setGlobalPrefix('api');

  // Enforce DTO validation globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
    }),
  );

  // CORS Configuration
  const frontendUrl = process.env.FRONTEND_URL;
  app.enableCors({
    origin: frontendUrl ? [frontendUrl, /\.vercel\.app$/] : true,
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
