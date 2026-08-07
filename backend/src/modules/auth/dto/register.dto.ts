import { IsEmail, IsString, IsOptional } from 'class-validator';
import { IsStrongPassword } from '../../../common/validators/strong-password.decorator';

export class RegisterDto {
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsEmail({}, { message: 'A valid email is required' })
  email: string;

  @IsStrongPassword()
  password: string;

  @IsOptional()
  @IsString()
  adminSecret?: string;

  @IsOptional()
  @IsString()
  adminSecretCode?: string;
}
