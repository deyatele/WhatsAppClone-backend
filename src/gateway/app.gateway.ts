// app.gateway.ts
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
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CallsService } from '../calls/calls.service';
import { MessagesService } from '../messages/messages.service';
import { CallStatus } from '@prisma/client';

@WebSocketGateway({ cors: { origin: '*' } })
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly callsService: CallsService,
    private readonly messagesService: MessagesService,
  ) {}

  afterInit() {}

  // ================= Подключение =================
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) throw new Error('Отсутствует токен');

      const payload = this.jwtService.verify<{ sub: string }>(token);
      client.data.userId = payload.sub;

      await this.usersService.setOnlineStatus(payload.sub, true);

      client.join(payload.sub);

      client.emit('id', client.data.userId);
      client.emit('connected:user', { userId: client.data.userId });

      this.server.emit('status:update', { userId: payload.sub, isOnline: true });

      console.log(`✅ User connected: ${payload.sub} (socketId=${client.id})`);
    } catch (err) {
      console.error('❌ Auth error:', err);
      client.emit('ошибка', { message: 'Ошибка авторизации' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    try {
      const updated = await this.usersService.setOnlineStatus(userId, false);
      this.server.emit('status:update', { userId, isOnline: false, lastSeen: updated.lastSeen });
      console.log(`❌ User disconnected: ${userId} (socketId=${client.id})`);
      
      // Start logging for call termination on disconnect
      console.log(`Attempting to end active calls for disconnected user: ${userId}`);
      try {
        const active = await this.callsService.getActiveCall(userId);
        if (active) {
          console.log(`Found active call ${active.id} for user ${userId}. Status: ${active.status}`);
          const ended = await this.callsService.endCall(active.id, userId);
          [ended.fromId, ended.toId].forEach((id) => {
            this.server.to(id).emit('call:ended', ended);
            console.log(`📞 Emitted call:ended to ${id} for callId=${ended.id} due to disconnect`);
          });
          console.log(`📴 Active call ${active.id} ended due to disconnect of ${userId}`);
        } else {
          console.log(`No active call found for disconnected user: ${userId}`);
        }
      } catch (e) {
        console.error('Error ending active calls on disconnect', e && e instanceof Error ? e.message : String(e));
      }
    } catch (err) {
      console.error('Error on disconnect handling for', userId, err);
    }
  }

  // ================= Сообщения =================
  @SubscribeMessage('message:send')
  async handleSendMessage(
    @MessageBody() data: { chatId: string; text: string },
    @ConnectedSocket() client: Socket,
  ) {
    const fromId = client.data.userId;
    if (!fromId) return client.emit('ошибка', { message: 'Неавторизованный пользователь' });

    try {
      const saved = await this.messagesService.sendMessage(fromId, {
        chatId: data.chatId,
        content: data.text,
      });

      this.server.to(data.chatId).emit('message:new', saved);

      client.emit('message:sent', {
        id: saved.id,
        chatId: data.chatId,
        text: saved.content,
        createdAt: saved.createdAt,
      });
    } catch (err) {
      client.emit('ошибка', {
        message: err instanceof Error ? err.message : 'Ошибка при отправке сообщения',
      });
    }
  }

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string, flag?:boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const flag = data.flag || false;
    if (!userId) return client.emit('ошибка', { message: 'Неавторизованный пользователь' });
    try {
      console.log('userId',userId, 'data.messageId', data.messageId)
      const deletedMessage = await this.messagesService.deleteMessage(userId, data.messageId, flag);
      this.server.to(deletedMessage.chatId).emit('message:deleted', deletedMessage);
    } catch (err) {
      client.emit('ошибка', {
        message: err instanceof Error ? err.message : 'Ошибка при удалении сообщения',
      });
    }
  }

  // ================= Логика звонков (бизнес) =================
  @SubscribeMessage('call:start')
  async handleCallStart(
    @MessageBody() data: { to: string; sdp?: any },
    @ConnectedSocket() client: Socket,
  ) {
    const fromId = client.data.userId;
    if (!fromId) return client.emit('ошибка', { message: 'Неавторизованный пользователь' });

    try {
      const call = await this.callsService.startCall(fromId, { to: data.to });
      this.server.to(data.to).emit('call:incoming', { ...call, sdp: data.sdp, from: fromId, callId: call.id });
      console.log(`Backend emitting call:started with callId: ${call.id} to ${fromId}`); // Added log
      client.emit('call:started', { call, sdp: data.sdp });
      console.log(`📞 call:start from ${fromId} to ${data.to} callId=${call.id}`);
    } catch (err) {
      console.error('call:start error', err);
      client.emit('ошибка', {
        message: err instanceof Error ? err.message : 'Ошибка при начале звонка',
      });
    }
  }

  @SubscribeMessage('call:accept')
  async handleCallAccept(
    @MessageBody() data: { callId: string; sdp?: any },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId) return client.emit('ошибка', { message: 'Неавторизованный пользователь' });

    try {
      if (!data || !data.callId) {
        client.emit('ошибка', { message: 'Missing callId for call:accept' });
        return;
      }
      const updated = await this.callsService.updateCallStatus(
        data.callId,
        CallStatus.accepted,
        userId,
      );
      [updated.fromId, updated.toId].forEach((id) => {
        this.server.to(id).emit('call:accepted', { ...updated, sdp: data.sdp, from: userId });
      });
      console.log(`📞 call:accept callId=${data.callId} by ${userId}`);
    } catch (err) {
      console.error('call:accept error', err);
      client.emit('ошибка', {
        message: err instanceof Error ? err.message : 'Ошибка при принятии звонка',
      });
    }
  }

  @SubscribeMessage('call:reject')
  async handleCallReject(
    @MessageBody() data: { callId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId) return client.emit('ошибка', { message: 'Неавторизованный пользователь' });

    try {
      if (!data || !data.callId) {
        client.emit('ошибка', { message: 'Missing callId for call:reject' });
        return;
      }
      const updated = await this.callsService.updateCallStatus(
        data.callId,
        CallStatus.rejected,
        userId,
      );
      [updated.fromId, updated.toId].forEach((id) =>
        this.server.to(id).emit('call:rejected', updated),
      );
      console.log(`📞 call:reject callId=${data.callId} by ${userId}`);
    } catch (err) {
      console.error('call:reject error', err);
      client.emit('ошибка', {
        message: err instanceof Error ? err.message : 'Ошибка при отклонении звонка',
      });
    }
  }

  @SubscribeMessage('call:end')
  async handleCallEnd(@MessageBody() data: { callId: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (!userId) return client.emit('ошибка', { message: 'Неавторизованный пользователь' });

    try {
      const ended = await this.callsService.endCall(data.callId, userId);
      [ended.fromId, ended.toId].forEach((id) => {
        this.server.to(id).emit('call:ended', ended);
        console.log(`📞 Emitted call:ended to ${id} for callId=${ended.id}`);
      });
      console.log(`📞 call:end callId=${data.callId} by ${userId}`);
    } catch (err) {
      console.error('call:end error', err);
      client.emit('ошибка', {
        message: err instanceof Error ? err.message : 'Ошибка при завершении звонка',
      });
    }
  }

  // ================= WebRTC сигналинг (низкоуровневые события) =================
  @SubscribeMessage('call:offer')
  handleOffer(@MessageBody() data: { to: string; sdp: any }, @ConnectedSocket() client: Socket) {
    const from = client.data.userId;
    console.log(`[GATEWAY] Received call:offer from ${from} to ${data.to}`); // <-- ЛОГ
    if (!from) return client.emit('ошибка', { message: 'Неавторизованный пользователь' });

    if (!data?.to) {
      client.emit('ошибка', { message: 'Missing "to" in call:offer' });
      return;
    }

    try {
      const room = this.server.sockets.adapter.rooms.get(data.to);
      if (!room) {
        client.emit('call:error', { message: 'Recipient offline or not connected', to: data.to });
        console.warn(`call:offer failed — recipient ${data.to} not in any room`);
        return;
      }

      this.server.to(data.to).emit('call:offer', { from, sdp: data.sdp });
      console.log(`call:offer forwarded from ${from} to ${data.to}`);
    } catch (err) {
      console.error('call:offer error', err);
      client.emit('ошибка', { message: 'Ошибка при пересылке оффера' });
    }
  }

  @SubscribeMessage('call:answer')
  handleAnswer(@MessageBody() data: { to: string; sdp: any }, @ConnectedSocket() client: Socket) {
    const from = client.data.userId;
    if (!from) return client.emit('ошибка', { message: 'Неавторизованный пользователь' });

    if (!data?.to) {
      client.emit('ошибка', { message: 'Missing "to" in call:answer' });
      return;
    }

    try {
      const room = this.server.sockets.adapter.rooms.get(data.to);
      if (!room) {
        client.emit('call:error', { message: 'Recipient offline or not connected', to: data.to });
        console.warn(`call:answer failed — recipient ${data.to} not in any room`);
        return;
      }

      // Update business call status to accepted if there's an active call between these users
      (async () => {
        try {
          const active = await this.callsService.getActiveCallBetweenEither(from, data.to);
          if (active) {
            await this.callsService.updateCallStatus(active.id, CallStatus.accepted, from);
            console.log(`📞 call ${active.id} marked as accepted due to answer from ${from}`);
            const updated = await this.callsService.getCalls(active.fromId);
            // notify parties about accepted via business event
            this.server.to(active.fromId).emit('call:accepted', { ...active, from });
            this.server.to(active.toId).emit('call:accepted', { ...active, from });
          }
        } catch (e) {
          console.error('Error updating call status on answer', e);
        }
      })();

      this.server.to(data.to).emit('call:answer', { from, sdp: data.sdp });
      console.log(`call:answer forwarded from ${from} to ${data.to}`);
    } catch (err) {
      console.error('call:answer error', err);
      client.emit('ошибка', { message: 'Ошибка при пересылке ответа' });
    }
  }

  @SubscribeMessage('call:candidate')
  handleCandidate(
    @MessageBody() data: { to: string; candidate: any },
    @ConnectedSocket() client: Socket,
  ) {
    const from = client.data.userId;
    if (!from) return client.emit('ошибка', { message: 'Неавторизованный пользователь' });

    if (!data?.to || !data.candidate) {
      client.emit('ошибка', { message: 'Missing "to" or "candidate" in call:candidate' });
      return;
    }

    try {
      const room = this.server.sockets.adapter.rooms.get(data.to);
      if (!room) {
        client.emit('call:error', { message: 'Recipient offline or not connected', to: data.to });
        console.warn(`call:candidate failed — recipient ${data.to} not in any room`);
        return;
      }

      this.server.to(data.to).emit('call:candidate', { from, candidate: data.candidate });
      console.log(`call:candidate forwarded from ${from} to ${data.to}`);
    } catch (err) {
      console.error('call:candidate error', err);
      client.emit('ошибка', { message: 'Ошибка при пересылке кандидата' });
    }
  }

  // ================= Чат =================
  @SubscribeMessage('chat:join')
  async handleJoinChat(@MessageBody() data: { chatId: string }, @ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (!userId) return client.emit('ошибка', { message: 'Неавторизованный пользователь' });

    client.join(data.chatId);
    client.emit('chat:joined', { chatId: data.chatId });
  }
}
