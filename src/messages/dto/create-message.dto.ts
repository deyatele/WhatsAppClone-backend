import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ description: 'ID чата, к которому относится сообщение' })
  @IsUUID()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({ description: 'Текст сообщения' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
