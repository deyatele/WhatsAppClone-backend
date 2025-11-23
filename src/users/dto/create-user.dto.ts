import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, MinLength, IsObject } from 'class-validator';
import { Transform } from 'class-transformer';
import type { JsonWebKey } from '../../types/jwk';

export class CreateUserDto {
  @ApiProperty({ description: 'Телефон пользователя' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Пароль пользователя' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Имя пользователя', required: false })
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Email пользователя', required: false })
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Публичный ключ пользователя', required: false })
  @IsOptional()
  @IsObject()
  publicKeyJwk?: JsonWebKey;
}
