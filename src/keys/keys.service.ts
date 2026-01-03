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

  async getKeysBackup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { publicKeyJwk: true, privateKeyJwk: true, id: true },
    });
    return user
      ? { publicKeyJwk: user.publicKeyJwk, privateKeyJwk: user.privateKeyJwk, id: user.id }
      : null;
  }
}
