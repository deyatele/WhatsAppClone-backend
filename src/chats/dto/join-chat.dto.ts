import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class JoinChatDto {
  @ApiProperty({
    description: 'ID чата для присоединения',
    example: '11d0300b-3eb3-4ce3-83d7-0378c5bd4409',
  })
  @IsUUID()
  chatId: string;
}
