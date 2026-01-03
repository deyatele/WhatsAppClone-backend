import { UseFilters, UseGuards, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsersService } from '../users/users.service';
import { CallsService } from '../calls/calls.service';
import { MessagesService } from '../messages/messages.service';
import { CallStatus } from '@prisma/client';
import { JsonValue } from '../types';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';
import type { SafeUser } from '../types';
import { AuthService } from '../auth/auth.service';
import { ChatsService } from '../chats/chats.service';

@UseGuards(WsJwtGuard)
@UseFilters(new WsExceptionFilter())
@WebSocketGateway({ cors: { origin: '*' } })
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly callsService: CallsService,
    private readonly messagesService: MessagesService,
    private readonly chatsService: ChatsService,
  ) {}

  afterInit() {}

  // ================= Подключение =================

  async handleConnection(client: Socket & { data: { user: SafeUser } }) {
    try {
      const token = client.handshake.auth.token;

      if (!token) {
        throw new Error('Отсутствует токен авторизации');
      }
      const user = await this.authService.verifyUser(token);
      if (!user) {
        throw new Error('Невалидный токен.');
      }
      client.data.user = user;

      await this.usersService.setOnlineStatus(user.id, true);
      client.join(user.id);

      this.server.emit('status:update', { userId: user.id, isOnline: true });
      this.logger.log(`✅ User connected: ${user.name} (${user.id}) | Socket ID: ${client.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Ошибка подключения WebSocket: ${message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket & { data: { user: SafeUser } }) {
    const { user } = client.data;
    if (!user) return; // Соединение прервано до аутентификации

    try {
      const updated = await this.usersService.setOnlineStatus(user.id, false);
      this.server.emit('status:update', {
        userId: user.id,
        isOnline: false,
        lastSeen: updated.lastSeen,
      });
      this.logger.log(`❌ User disconnected: ${user.name} (${user.id}) | Socket ID: ${client.id}`);

      // Попытка завершить активные звонки
      const activeCall = await this.callsService.getActiveCall(user.id);
      if (activeCall) {
        const endedCall = await this.callsService.endCall(activeCall.id, user.id);
        [endedCall.fromId, endedCall.toId].forEach((id) => {
          this.server.to(id).emit('call:ended', endedCall);
        });
        this.logger.log(`📴 Активный звонок ${activeCall.id} завершен из-за отключения ${user.id}`);
      }
    } catch (error) {
      // Логируем ошибку, так как WsExceptionFilter не сможет отправить сообщение отключенному клиенту
      this.logger.error(
        `Ошибка при обработке отключения для пользователя ${user.id}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // ================= Сообщения =================
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @MessageBody() data: { chatId: string; text: JsonValue },
    @ConnectedSocket() client: Socket & { data: { user: SafeUser } },
  ) {
    const fromId = client.data.user.id;
    const saved = await this.messagesService.sendMessage(fromId, {
      chatId: data.chatId,
      encryptedMessage: data.text,
    });

    this.server.to(data.chatId).emit('message:new', saved);
  }

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string; flag?: boolean },
    @ConnectedSocket() client: Socket & { data: { user: SafeUser } },
  ) {
    const userId = client.data.user.id;
    const flag = data.flag || false;
    const deletedMessage = await this.messagesService.deleteMessage(userId, data.messageId, flag);
    this.server.to(deletedMessage.chatId).emit('message:deleted', deletedMessage);
  }

  // ================= Логика звонков (бизнес) =================
  @SubscribeMessage('call:start')
  async handleCallStart(
    @MessageBody() data: { to: string; sdp?: any },
    @ConnectedSocket() client: Socket & { data: { user: SafeUser } },
  ) {
    const fromId = client.data.user.id;
    const call = await this.callsService.startCall(fromId, { to: data.to });
    this.server
      .to(data.to)
      .emit('call:incoming', { ...call, sdp: data.sdp, from: fromId, callId: call.id });
    client.emit('call:started', { call, sdp: data.sdp });
    this.logger.log(`📞 call:start from ${fromId} to ${data.to} callId=${call.id}`);
  }

  @SubscribeMessage('call:accept')
  async handleCallAccept(
    @MessageBody() data: { callId: string; sdp?: any },
    @ConnectedSocket() client: Socket & { data: { user: SafeUser } },
  ) {
    const userId = client.data.user.id;
    const updated = await this.callsService.updateCallStatus(
      data.callId,
      CallStatus.accepted,
      userId,
    );
    [updated.fromId, updated.toId].forEach((id) => {
      this.server.to(id).emit('call:accepted', { ...updated, sdp: data.sdp, from: userId });
    });
    this.logger.log(`📞 call:accept callId=${data.callId} by ${userId}`);
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @MessageBody() data: { callId: string },
    @ConnectedSocket() client: Socket & { data: { user: SafeUser } },
  ) {
    const userId = client.data.user.id;
    const updated = await this.callsService.updateCallStatus(
      data.callId,
      CallStatus.rejected,
      userId,
    );
    [updated.fromId, updated.toId].forEach((id) =>
      this.server.to(id).emit('call:rejected', updated),
    );
    this.logger.log(`📞 call:reject callId=${data.callId} by ${userId}`);
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(
    @MessageBody() data: { callId: string },
    @ConnectedSocket() client: Socket & { data: { user: SafeUser } },
  ) {
    const userId = client.data.user.id;
    const ended = await this.callsService.endCall(data.callId, userId);
    [ended.fromId, ended.toId].forEach((id) => {
      this.server.to(id).emit('call:ended', ended);
    });
    this.logger.log(`📞 call:end callId=${data.callId} by ${userId}`);
  }

  // ================= WebRTC сигналинг (низкоуровневые события) =================
  @SubscribeMessage('call:offer')
  handleOffer(
    @MessageBody() data: { to: string; sdp: any },
    @ConnectedSocket() client: Socket & { data: { user: SafeUser } },
  ) {
    const from = client.data.user.id;
    this.server.to(data.to).emit('call:offer', { from, sdp: data.sdp });
  }

  @SubscribeMessage('call:answer')
  handleAnswer(
    @MessageBody() data: { to: string; sdp: any },
    @ConnectedSocket() client: Socket & { data: { user: SafeUser } },
  ) {
    const from = client.data.user.id;
    this.server.to(data.to).emit('call:answer', { from, sdp: data.sdp });
  }

  @SubscribeMessage('call:candidate')
  handleCandidate(
    @MessageBody() data: { to: string; candidate: any },
    @ConnectedSocket() client: Socket & { data: { user: SafeUser } },
  ) {
    const from = client.data.user.id;
    this.server.to(data.to).emit('call:candidate', { from, candidate: data.candidate });
  }

  // ================= Чат =================
  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @MessageBody() data: { chatId: string },
    @ConnectedSocket() client: Socket & { data: { user: SafeUser } },
  ) {
    client.join(data.chatId);
    client.emit('chat:joined', { chatId: data.chatId });
  }

  @SubscribeMessage('chat:create')
  async handleCreateChat(
    @MessageBody() data: { to: string; chatId: string },
    @ConnectedSocket() client: Socket & { data: { user: SafeUser } },
  ) {
    const chat = await this.chatsService.getChat(data.chatId, client.data.user.id);
    this.server.to(data.to).emit('chat:created', { chat });
  }
}
