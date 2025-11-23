import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ChatsService } from './chats.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { JoinChatDto } from './dto/join-chat.dto';

@ApiTags('Chats')
@ApiBearerAuth('access-token')
@Controller('chats')
export class ChatsController {
  constructor(private readonly chats: ChatsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: CreateChatDto })
  @ApiResponse({
    status: 201,
    description: 'Чат создан или возвращён существующий',
    schema: {
      example: {
        id: '11d0300b-3eb3-4ce3-83d7-0378c5bd4409',
        createdAt: '2025-09-26T12:16:08.153Z',
        updatedAt: '2025-09-26T12:16:08.153Z',
        participants: [
          {
            id: '3329a2af-eb2e-4a08-97bd-76ed8094a760',
            chatId: '11d0300b-3eb3-4ce3-83d7-0378c5bd4409',
            userId: '147ae3d7-19c8-4370-8210-1fa49bbdd332',
            user: {
              id: '147ae3d7-19c8-4370-8210-1fa49bbdd332',
              name: 'John Doe',
            },
          },
          {
            id: 'c896b7c6-d914-40ce-b5cd-0f641777e5d5',
            chatId: '11d0300b-3eb3-4ce3-83d7-0378c5bd4409',
            userId: 'a9d14b03-45be-4d69-90a7-7530dc5cafed',
            user: {
              id: 'a9d14b03-45be-4d69-90a7-7530dc5cafed',
              name: 'Green Pies',
            },
          },
        ],
        messages: [],
      },
    },
  })
  async createChat(@Req() req: any, @Body() dto: CreateChatDto) {
    return this.chats.createChat(req.user.userId, dto.userId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Список чатов пользователя',
    schema: {
      example: [
        {
          id: '11d0300b-3eb3-4ce3-83d7-0378c5bd4409',
          createdAt: '2025-09-26T12:16:08.153Z',
          updatedAt: '2025-09-26T12:16:08.153Z',
          participants: [
            {
              id: '3329a2af-eb2e-4a08-97bd-76ed8094a760',
              chatId: '11d0300b-3eb3-4ce3-83d7-0378c5bd4409',
              userId: '147ae3d7-19c8-4370-8210-1fa49bbdd332',
              user: {
                id: '147ae3d7-19c8-4370-8210-1fa49bbdd332',
                name: 'John Doe',
              },
            },
            {
              id: 'c896b7c6-d914-40ce-b5cd-0f641777e5d5',
              chatId: '11d0300b-3eb3-4ce3-83d7-0378c5bd4409',
              userId: 'a9d14b03-45be-4d69-90a7-7530dc5cafed',
              user: {
                id: 'a9d14b03-45be-4d69-90a7-7530dc5cafed',
                name: 'Green Pies',
              },
            },
          ],
          messages: [],
        },
      ],
    },
  })
  async getMyChats(@Req() req: any) {
    return await this.chats.getUserChats(req.user.userId);
  }

  @Post('join')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: JoinChatDto })
  @ApiResponse({
    status: 201,
    description: 'Присоединение к чату',
  })
  async joinChat(@Req() req: any, @Body() dto: JoinChatDto) {
    return this.chats.joinChat(req.user.userId, dto.chatId);
  }

  @Get('invite')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 201,
    description: 'Инвайт для добавления пользователя',
    schema: {
      example: {
        token: 'uIqXwZcRfDj8EbL4YvF2m',
      },
    },
  })
  async inviteChatToken(@Req() req: any) {
    return this.chats.getInviteChatToken(req.user.userId);
  }

  @Post('invite')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({
    status: 200,
    description: 'Получение данных пользователя по инвайт токену',
    schema: {
      example: {
        userId: 'uIqXwZcRfDj8EbL4YvF2m',
      },
    },
  })
  async getUserInviteChat(@Req() req: any, @Body() dto: { token: string }) {
    return this.chats.getUserInviteChat(dto.token);
  }
}
