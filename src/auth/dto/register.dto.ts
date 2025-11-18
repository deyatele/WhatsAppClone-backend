import { IsString, IsOptional, IsEmail, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { JsonWebKey } from '../../types/jwk';

export class RegisterDto {
  @ApiProperty({ example: 'test@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phone: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  publicKeyJwk?: JsonWebKey;
}
