// calls.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CallStatus } from '@prisma/client';
import { CreateCallDto } from './dto/create-call.dto';

@Injectable()
export class CallsService {
  constructor(private readonly prisma: PrismaService) {}

  async startCall(fromId: string, dto: CreateCallDto) {
    const otherUser = await this.prisma.user.findUnique({
      where: { id: dto.to },
    });

    if (!otherUser) {
      throw new Error(`Пользователь ${dto.to} не найден`);
    }
    return this.prisma.call.create({
      data: {
        fromId,
        toId: dto.to,
        status: CallStatus.pending,
        startedAt: new Date(),
      },
    });
  }

  async getCalls(userId: string) {
    return this.prisma.call.findMany({
      where: {
        OR: [{ fromId: userId }, { toId: userId }],
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getActiveCall(userId: string) {
    return this.prisma.call.findFirst({
      where: {
        OR: [{ fromId: userId }, { toId: userId }],
        status: { in: [CallStatus.pending, CallStatus.accepted] },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getActiveCallBetween(fromId: string, toId: string) {
    return this.prisma.call.findFirst({
      where: {
        fromId,
        toId,
        status: { in: [CallStatus.pending, CallStatus.accepted] },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getActiveCallBetweenEither(a: string, b: string) {
    return this.prisma.call.findFirst({
      where: {
        OR: [
          { fromId: a, toId: b, status: { in: [CallStatus.pending, CallStatus.accepted] } },
          { fromId: b, toId: a, status: { in: [CallStatus.pending, CallStatus.accepted] } },
        ],
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async updateCallStatus(callId: string, status: CallStatus, userId: string) {
    console.log(callId, status, userId);
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) {
      throw new NotFoundException('Звонок не найден');
    }

    if (status === CallStatus.accepted || status === CallStatus.rejected) {
      if (call.toId !== userId) {
        throw new ForbiddenException(
          'Только вызываемый пользователь может принять или отклонить звонок',
        );
      }
    }

    const updated = await this.prisma.call.update({
      where: { id: callId },
      data: { status },
    });

    return updated;
  }

  async endCall(callId: string, userId: string) {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) {
      throw new NotFoundException('Звонок не найден');
    }
    if (call.fromId !== userId && call.toId !== userId) {
      throw new ForbiddenException('Только участник звонка может завершить его');
    }

    const updated = await this.prisma.call.update({
      where: { id: callId },
      data: { status: CallStatus.ended, endedAt: new Date() },
    });

    return updated;
  }
}
