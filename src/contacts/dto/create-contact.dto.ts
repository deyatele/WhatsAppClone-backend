import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: 'uuid-of-friend', description: 'ID пользователя, которого добавляем в контакты' })
  @IsString()
  contactId: string;
}
