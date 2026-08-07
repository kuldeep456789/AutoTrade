import { IsNotEmpty, IsString } from 'class-validator';

export class Enable2FaDto {
  @IsNotEmpty({ message: 'Secret key is required' })
  @IsString()
  secret: string;

  @IsNotEmpty({ message: 'Authentication code is required' })
  @IsString()
  code: string;
}
