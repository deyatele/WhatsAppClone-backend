import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateMessageDto {
  @ApiPropertyOptional({ description: 'Обновлённый текст сообщения' })
  @IsString()
  @IsOptional()
  content?: string;
}
