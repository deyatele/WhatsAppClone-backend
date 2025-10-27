import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({
    description: 'ID собеседника (userId)',
    example: '2f8a2d84-9b16-4b5e-8a3e-bf8db67a7c0a',
  })
  @IsUUID()
  userId: string;
}
