import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  async findAllForUser(userId: string) {
    return this.prisma.contact.findMany({
      where: { ownerId: userId },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });
  }

  async addContact(ownerId: string, contactId: string) {
    return this.prisma.contact.create({
      data: {
        ownerId,
        contactId,
      },
    });
  }
}
