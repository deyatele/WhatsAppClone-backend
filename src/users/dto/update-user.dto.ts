import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail, IsBoolean, IsDate } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Имя пользователя' })
  @IsOptional()
  @IsString()
  name?: string | null;

  @ApiPropertyOptional({ description: 'Телефон пользователя' })
  @IsOptional()
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Email пользователя' })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ description: 'Аватар пользователя' })
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
