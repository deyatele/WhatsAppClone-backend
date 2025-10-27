import { Controller, Get, Post, Body, UseGuards, Req, Patch, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CreateCallDto } from './dto/create-call.dto';

@ApiTags('Calls')
@ApiBearerAuth('access-token')
@Controller('calls')
export class CallsController {
  private readonly logger = new Logger(CallsController.name);

  constructor(private readonly calls: CallsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBody({
    type: CreateCallDto,
    examples: {
      example: {
        summary: 'Начало звонка',
        value: { to: 'uuid-of-friend' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Звонок начат',
    schema: {
      example: {
        id: 'uuid-of-call',
        fromId: 'uuid-of-current-user',
        toId: 'uuid-of-friend',
        status: 'pending',
        startedAt: '2025-09-26T08:25:00.000Z',
        endedAt: null,
      },
    },
  })
  async startCall(@Req() req: any, @Body() dto: CreateCallDto) {
    const answer = await this.calls.startCall(req.user.userId, dto);
    console.log(answer);
    return answer;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'История звонков пользователя',
    schema: {
      example: [
        {
          id: 'uuid-of-call-1',
          fromId: 'uuid-of-current-user',
          toId: 'uuid-of-friend',
          status: 'ended',
          startedAt: '2025-09-25T15:00:00.000Z',
          endedAt: '2025-09-25T15:05:00.000Z',
        },
        {
          id: 'uuid-of-call-2',
          fromId: 'uuid-of-friend',
          toId: 'uuid-of-current-user',
          status: 'accepted',
          startedAt: '2025-09-26T07:30:00.000Z',
          endedAt: null,
        },
      ],
    },
  })
  async getCalls(@Req() req: any) {
    return this.calls.getCalls(req.user.userId);
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Текущий активный звонок (если есть)',
    schema: {
      oneOf: [
        {
          example: {
            id: 'uuid-of-call-2',
            fromId: 'uuid-of-friend',
            toId: 'uuid-of-current-user',
            status: 'accepted',
            startedAt: '2025-09-26T07:30:00.000Z',
            endedAt: null,
          },
        },
        { example: null },
      ],
    },
  })
  async getActive(@Req() req: any) {
    return this.calls.getActiveCall(req.user.userId);
  }

  @Patch(':id/end')
  @UseGuards(JwtAuthGuard)
  @ApiParam({ name: 'id', description: 'ID звонка' })
  @ApiResponse({
    status: 200,
    description: 'Звонок завершён',
    schema: {
      example: {
        id: 'uuid-of-call',
        fromId: 'uuid-of-current-user',
        toId: 'uuid-of-friend',
        status: 'ended',
        startedAt: '2025-09-26T07:30:00.000Z',
        endedAt: '2025-09-26T07:45:00.000Z',
      },
    },
  })
  async endCall(@Param('id') id: string, @Req() req: any) {
    this.logger.log(`Received PATCH /calls/${id}/end from userId: ${req.user.userId}`);
    return this.calls.endCall(id, req.user.userId);
  }
}
