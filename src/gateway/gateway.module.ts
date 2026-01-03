import { Module } from '@nestjs/common';
import { AppGateway } from './app.gateway';
import { GatewayDocsController } from './gateway-docs.controller';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { CallsModule } from '../calls/calls.module';
import { MessagesModule } from '../messages/messages.module';
import { ChatsModule } from '../chats/chats.module';

@Module({
  imports: [AuthModule, UsersModule, CallsModule, MessagesModule, ChatsModule],
  providers: [AppGateway],
  controllers: [GatewayDocsController],
  exports: [AppGateway],
})
export class GatewayModule {}
