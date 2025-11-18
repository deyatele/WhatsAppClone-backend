import { Injectable } from '@nestjs/common';
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
    otherUserId: string,
  ): Promise<ChatWithParticipantsAndLastMessage> {
    if (userId === otherUserId) {
      throw new Error('Нельзя создать чат с самим собой');
    }

    let chat = await this.prisma.chat.findFirst({
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
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
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

  async getChat(chatId: string): Promise<ChatWithParticipantsAndLastMessage | null> {
    return this.prisma.chat.findUnique({
      where: { id: chatId },
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

    return this.getChat(chatId);
  }
}
