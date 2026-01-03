import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Chat, ChatParticipant, Message } from '@prisma/client';
import type { SafeUser } from '../types';

type ChatWithParticipantsAndLastMessage = Omit<Chat, 'participants' | 'messages'> & {
  participants: (ChatParticipant & {
    user: Pick<SafeUser, 'id' | 'name'>;
  })[];
  messages: (Message & {
    sender: Pick<SafeUser, 'id' | 'name'>;
  })[];
};

@Injectable()
export class ChatsService {
  constructor(private readonly prisma: PrismaService) {}

  async createChat(
    userId: string,
    otherUserId: string | null,
    inviteToken: string | null,
  ): Promise<
    | { id: string; createdAt: Date; updatedAt: Date }
    | { error: string; message: string }
    | undefined
  > {
    if (inviteToken) {
      const tokenExist = await this.prisma.inviteToken.findUnique({
        where: {
          id: inviteToken,
        },
      });
      if (tokenExist) {
        await this.prisma.inviteToken.delete({
          where: {
            id: tokenExist.id,
          },
        });
      }
    }
    if (!otherUserId) {
      throw new HttpException('Участник не указан', HttpStatus.BAD_REQUEST);
    }

    if (userId === otherUserId) {
      throw new HttpException(
        {
          error: 'self_chat_forbidden',
          message: 'Нельзя создать чат с самим собой',
        },
        HttpStatus.BAD_REQUEST, // 400
      );
    }

    let chat: { id: string; createdAt: Date; updatedAt: Date } | null = null;

    chat = await this.prisma.chat.findFirst({
      where: {
        participants: {
          every: {
            userId: { in: [userId, otherUserId] },
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (chat) {
      throw new HttpException(
        {
          error: 'chat_already_exists',
          message: 'Чат уже создан',
          chatId: chat.id,
        },
        HttpStatus.CONFLICT,
      );
    }

    if (!chat) {
      chat = await this.prisma.chat.create({
        data: {
          participants: {
            create: [{ userId }, { userId: otherUserId }],
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  publicKeyJwk: true,
                },
              },
            },
          },
        },
      });
    }
    return chat;
  }

  async getUserChats(userId: string): Promise<ChatWithParticipantsAndLastMessage[]> {
    const chats = await this.prisma.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, avatar: true, publicKeyJwk: true } } },
        },
        messages: {
          where: {
            OR: [
              {
                senderId: userId,
                deletedSender: false,
              },
              {
                senderId: { not: userId },
                deletedReceiver: false,
              },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true, publicKeyJwk: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return chats;
  }

  async getChat(
    chatId: string,
    userId: string,
  ): Promise<ChatWithParticipantsAndLastMessage | null> {
    return this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, avatar: true, publicKeyJwk: true } } },
        },
        messages: {
          where: {
            OR: [
              {
                senderId: userId,
                deletedSender: false,
              },
              {
                senderId: { not: userId },
                deletedReceiver: false,
              },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true, publicKeyJwk: true } } },
        },
      },
    });
  }

  async joinChat(
    userId: string,
    chatId: string,
  ): Promise<ChatWithParticipantsAndLastMessage | null> {
    const chatExists = await this.prisma.chat.findUnique({
      where: {
        id: chatId,
      },
      include: {
        participants: true,
      },
    });

    if (!chatExists) {
      throw new Error('Чат не найден');
    }

    const isParticipant = chatExists.participants.some(
      (participant) => participant.userId === userId,
    );

    if (!isParticipant) {
      await this.prisma.chatParticipant.create({
        data: {
          chatId: chatId,
          userId: userId,
        },
      });
    }

    return this.getChat(chatId, userId);
  }

  async getInviteChatToken(id: string): Promise<{ id: string }> {
    if (!id) {
      throw new Error('Нет пользователя который хочет создать приглашение');
    }
    return await this.prisma.inviteToken.create({
      data: {
        userId: id,
      },
      select: {
        id: true,
      },
    });
  }

  async getUserInviteChat(token: string): Promise<{ userId: string }> {
    if (!token) throw new Error('Нет инвайт токена');
    const userId = await this.prisma.inviteToken.findUnique({
      where: { id: token },
      select: {
        userId: true,
      },
    });
    if (!userId) throw new Error('Токен не валидный');
    return userId;
  }
}
