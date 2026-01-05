import { validationSchema } from './config.schema';
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ContactsModule } from './contacts/contacts.module';
import { MessagesModule } from './messages/messages.module';
import { CallsModule } from './calls/calls.module';
import { GatewayModule } from './gateway/gateway.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { ChatsModule } from './chats/chats.module';
import { TurnCredentialsModule } from './turn-credentials/turn-credentials.module';
import { KeysModule } from './keys/keys.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    AuthModule,
    UsersModule,
    ContactsModule,
    ChatsModule,
    MessagesModule,
    CallsModule,
    GatewayModule,
    PrismaModule,
    TurnCredentialsModule,
    KeysModule,
    HealthModule,
  ],
})
export class AppModule {}
