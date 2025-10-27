import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'test@example.com', description: 'Email или телефон для входа' })
  @IsString()
  identifier: string;

  @ApiProperty({ example: 'secret123', description: 'Пароль' })
  @IsString()
  password: string;
}
