import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('WebSocket Gateway')
@Controller('gateway-docs')
export class GatewayDocsController {
  @Get()
  @ApiResponse({
    status: 200,
    description: 'Описание событий WebSocket Gateway',
  })
  getDocs() {
    return {
      connect: 'Подключение к ws://localhost:3000',
      events: {
        'status:update': {
          on: 'status:update',
          payload: { userId: 'uuid', isOnline: true, lastSeen: 'date?' },
          description: 'Обновление статуса пользователя',
        },
        'message:send': {
          emit: 'message:send',
          payload: { to: 'uuid', text: 'Hello' },
          description: 'Отправка сообщения',
        },
        'message:sent': {
          on: 'message:sent',
          payload: { id: 'uuid', to: 'uuid', text: 'Hello', createdAt: 'date' },
          description: 'Подтверждение отправки сообщения',
        },
        message: {
          on: 'message',
          payload: { id: 'uuid', from: 'uuid', to: 'uuid', text: 'Hello', createdAt: 'date' },
          description: 'Получение сообщения',
        },
        'call:start': {
          emit: 'call:start',
          payload: { to: 'uuid' },
          description: 'Начало звонка',
        },
        'call:incoming': {
          on: 'call:incoming',
          payload: { id: 'uuid', fromId: 'uuid', toId: 'uuid', status: 'pending' },
          description: 'Входящий звонок',
        },
        'call:started': {
          on: 'call:started',
          payload: { id: 'uuid', fromId: 'uuid', toId: 'uuid', status: 'pending' },
          description: 'Звонок успешно создан',
        },
        'call:accept': {
          emit: 'call:accept',
          payload: { callId: 'uuid' },
          description: 'Принятие звонка',
        },
        'call:accepted': {
          on: 'call:accepted',
          payload: { id: 'uuid', status: 'accepted' },
          description: 'Звонок принят',
        },
        'call:reject': {
          emit: 'call:reject',
          payload: { callId: 'uuid' },
          description: 'Отклонение звонка',
        },
        'call:rejected': {
          on: 'call:rejected',
          payload: { id: 'uuid', status: 'rejected' },
          description: 'Звонок отклонён',
        },
        'call:end': {
          emit: 'call:end',
          payload: { callId: 'uuid' },
          description: 'Завершение звонка',
        },
        'call:ended': {
          on: 'call:ended',
          payload: { id: 'uuid', status: 'ended' },
          description: 'Звонок завершён',
        },
        offer: {
          emit: 'offer',
          payload: { to: 'uuid', sdp: {} },
          description: 'Отправка SDP-предложения',
        },
        answer: {
          emit: 'answer',
          payload: { to: 'uuid', sdp: {} },
          description: 'Отправка SDP-ответа',
        },
        ice: {
          emit: 'ice',
          payload: { to: 'uuid', candidate: {} },
          description: 'Отправка ICE-кандидата',
        },
      },
    };
  }
}
