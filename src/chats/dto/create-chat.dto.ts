import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, Matches } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({
    description: 'ID собеседника (userId)',
    example: '2f8a2d84-9b16-4b5e-8a3e-bf8db67a7c0a',
  })
  @IsOptional()
  @IsUUID()
  userId: string | null;

  @ApiProperty({
    description: 'NanoID инвайт токен для присоединения',
    example: 'V1StGXR8_Z5jdHi6B-myT',
  })
  @IsOptional()
  @Matches(/^[a-zA-Z0-9_-]{21}$/, {
    message: 'Некорректный формат NanoID. Ожидается 21 символ из набора A-Za-z0-9_-',
  })
  inviteToken: string | null;
}
