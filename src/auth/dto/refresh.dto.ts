import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh токен для обновления access токена' })
  @IsString()
  refreshToken: string;
}
