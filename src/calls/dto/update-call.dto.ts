import { ApiProperty } from '@nestjs/swagger';
import { CallStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateCallDto {
  @ApiProperty({
    enum: CallStatus,
    description: 'Новый статус звонка',
    example: CallStatus.accepted,
  })
  @IsEnum(CallStatus, { message: 'Некорректный статус звонка' })
  status: CallStatus;

  @ApiProperty({
    description: 'Время окончания звонка (если статус = ended)',
    required: false,
    example: '2025-09-26T08:30:00.000Z',
  })
  @IsOptional()
  endedAt?: Date;
}
