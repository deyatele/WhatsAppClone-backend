import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        throw new WsException('Отсутствует токен авторизации');
      }

      const user = await this.authService.verifyUser(token);
      if (!user) {
        throw new WsException('Невалидный токен.');
      }

      client.data.user = user;
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`Ошибка аутентификации WebSocket: ${message}`);
      throw new WsException(message);
    }
  }
}
