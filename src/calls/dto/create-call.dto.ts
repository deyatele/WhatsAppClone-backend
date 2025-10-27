import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCallDto {
  @ApiProperty({ example: 'uuid-of-friend', description: 'ID пользователя, которому звоним' })
  @IsString()
  to: string;
}
