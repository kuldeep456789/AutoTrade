import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync, IsOptional, IsBoolean } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  MONGODB_URI: string;

  @IsString()
  @IsOptional()
  UPSTASH_REDIS_REST_URL?: string;

  @IsString()
  @IsOptional()
  UPSTASH_REDIS_REST_TOKEN?: string;

  @IsBoolean()
  @IsOptional()
  REDIS_ENABLED?: boolean;

  @IsString()
  @IsOptional()
  CJ_API_BASE_URL?: string;

  @IsString()
  @IsOptional()
  CJ_API_KEY?: string;

  @IsString()
  @IsOptional()
  CJ_EMAIL?: string;

  @IsString()
  @IsOptional()
  STRIPE_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  STRIPE_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  STRIPE_RETURN_BASE_URL?: string;

  @IsString()
  @IsOptional()
  MAIL_USER?: string;

  @IsString()
  @IsOptional()
  MAIL_PASS?: string;

  @IsString()
  @IsOptional()
  MAIL_FROM?: string;

  @IsString()
  @IsOptional()
  ADMIN_SECRET_CODE?: string;

  @IsString()
  @IsOptional()
  JWT_SECRET?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Config validation error: ${errors.toString()}`);
  }
  return validatedConfig;
}
