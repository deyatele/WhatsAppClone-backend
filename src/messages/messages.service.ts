import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message, Chat, ChatParticipant, Prisma } from '@prisma/client';
import { Exact, SafeUser } from '../types';
import { PaginationDto } from './dto/pagination.dto';

type MessageWithSender = Message & { sender: Pick<SafeUser, 'id' | 'name'> };
type MessageWithSenderAndChat = Message & {
  sender: Exact<Pick<SafeUser, 'id' | 'name'>, { id: string; name: string | null }>;
  chat: Chat & {
    participants: (ChatParticipant & {
      user: Exact<Pick<SafeUser, 'id' | 'name'>, { id: string; name: string | null }>;
    })[];
  };
};
type ChatWithLastMessageAndParticipants = Omit<Chat, 'participants' | 'messages'> & {
  participants: (ChatParticipant & {
    user: Pick<SafeUser, 'id' | 'name'>;
  })[];
  messages: (Message & {
    sender: Pick<SafeUser, 'id' | 'name'>;
  })[];
};

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(userId: string, dto: CreateMessageDto): Promise<MessageWithSenderAndChat> {
    const participant = await this.prisma.chatParticipant.findFirst({
      where: { chatId: dto.chatId, userId },
    });

    if (!participant) {
      throw new ForbiddenException('Вы не являетесь участником этого чата');
    }

    try {
      const message = await this.prisma.message.create({
        data: {
          chatId: dto.chatId,
          senderId: userId,
          encryptedMessage: dto.encryptedMessage === null ? Prisma.JsonNull : dto.encryptedMessage,
        },
        include: {
          sender: {
            select: { id: true, name: true },
          },
          chat: {
            include: {
              participants: {
                include: { user: { select: { id: true, name: true } } },
              },
            },
          },
        },
      });
      return message as MessageWithSenderAndChat;
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Ошибка при создании сообщения',
      );
    }
  }

  async getMessages(
    userId: string,
    chatId: string,
    paginationDto: PaginationDto,
  ): Promise<{ messages: MessageWithSender[]; nextCursor: string | null }> {
    const { limit, cursor } = paginationDto;
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true },
    });

    if (!chat) {
      throw new NotFoundException('Чат не найден');
    }

    const isParticipant = chat.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenException('Вы не являетесь участником этого чата');
    }

    const messages = await this.prisma.message.findMany({
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: {
          id: cursor,
        },
      }),
      where: {
        chatId,
        NOT: [
          {
            senderId: userId,
            deletedSender: true,
          },
          {
            senderId: { not: userId },
            deletedReceiver: true,
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            avatar: true,
            publicKeyJwk: true,
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (messages.length === limit) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        nextCursor = lastMessage.id;
      }
    }
    const res = { messages: messages, nextCursor };
    return res;
  }

  async getUserChats(userId: string): Promise<ChatWithLastMessageAndParticipants[]> {
    const chats = await this.prisma.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: { user: true },
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
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                avatar: true,
                publicKeyJwk: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return chats as ChatWithLastMessageAndParticipants[];
  }

  async findOne(messageId: string): Promise<MessageWithSender> {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, phone: true, email: true, avatar: true } },
      },
    });

    if (!msg) {
      throw new NotFoundException('Сообщение не найдено');
    }

    return msg as MessageWithSender;
  }

  async deleteMessage(userId: string, messageId: string, flag: boolean): Promise<Message> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Сообщение не найдено');
    }
    if (message.senderId === userId && flag) {
      const deletedMessage = await this.prisma.message.delete({
        where: { id: messageId },
        include: {
          sender: { select: { id: true, name: true, phone: true, email: true, avatar: true } },
        },
      });
      return { ...deletedMessage, deletedReceiver: true, deletedSender: true };
    }
    if (message.senderId !== userId && !message.deletedReceiver && !message.deletedSender) {
      const res = await this.prisma.message.update({
        where: { id: messageId },
        data: { deletedReceiver: true },
        include: {
          sender: { select: { id: true, name: true, phone: true, email: true, avatar: true } },
        },
      });
      return res;
    }
    if (message.senderId !== userId && message.deletedSender) {
      const deletedMessage = await this.prisma.message.delete({
        where: { id: messageId },
        include: {
          sender: { select: { id: true, name: true, phone: true, email: true, avatar: true } },
        },
      });
      return { ...deletedMessage, deletedReceiver: true, deletedSender: true };
    }
    if (message.senderId === userId && !message.deletedSender && !message.deletedReceiver) {
      const res = await this.prisma.message.update({
        where: { id: messageId },
        data: { deletedSender: true },
        include: {
          sender: { select: { id: true, name: true, phone: true, email: true, avatar: true } },
        },
      });
      return res;
    }
    if (message.senderId === userId && message.deletedReceiver) {
      const deletedMessage = await this.prisma.message.delete({
        where: { id: messageId },
        include: {
          sender: { select: { id: true, name: true, phone: true, email: true, avatar: true } },
        },
      });
      return { ...deletedMessage, deletedReceiver: true, deletedSender: true };
    }

    return await this.prisma.message.findUniqueOrThrow({
      where: { id: messageId },
      include: {
        sender: { select: { id: true, name: true, phone: true, email: true, avatar: true } },
      },
    });
  }
}
