import { ApiProperty } from '@nestjs/swagger';
import { InputJsonValue, JsonNull } from '../../types';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ description: 'ID чата, к которому относится сообщение' })
  @IsUUID()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({ description: 'Зашифрованное сообщение' })
  @IsString()
  @IsNotEmpty()
  encryptedMessage: InputJsonValue | JsonNull;
}
