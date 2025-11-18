import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KeysService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicKey(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { publicKeyJwk: true },
    });
    return user ? { publicKeyJwk: user.publicKeyJwk } : null;
  }

  async getPrivateKeyBackup(userId: string) {
    return this.prisma.privateKeyBackup.findUnique({
      where: { userId },
    });
  }

  async deletePrivateKeyBackup(userId: string) {
    return this.prisma.privateKeyBackup.delete({
      where: { userId },
    });
  }
}
