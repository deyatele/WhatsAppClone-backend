import { IsString, IsOptional, IsEmail, IsObject, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import type { JsonWebKey, JsonWebKeyPrivate } from '../../types/jwk';

export class RegisterDto {
  @ApiProperty({ example: 'test@example.com', required: false })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '+79108883355', required: true })
  @IsString()
  @IsPhoneNumber('RU', { message: 'Не правильный номер телефона' })
  phone: string;

  @ApiProperty({ example: 'secret123' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: true })
  @IsObject()
  publicKeyJwk: JsonWebKey;

  @ApiProperty({ required: true })
  @IsObject()
  privateKeyJwk: JsonWebKeyPrivate;
}
