import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsDate } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Имя пользователя' })
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiPropertyOptional({ description: 'Телефон пользователя' })
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Email пользователя' })
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ description: 'Аватар пользователя' })
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsString()
  avatar?: string | null;

  @ApiPropertyOptional({ description: 'Дата регистрации' })
  @IsDate({ message: 'createdAt должен быть Date' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Дата обновления' })
  @IsDate({ message: 'updatedAt должен быть Date' })
  updatedAt: Date;
}
