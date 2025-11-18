import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateUserDto } from './dto/update-user.dto';
import { Prisma } from '@prisma/client';
import type { JsonWebKey, JsonWebKeyPrivate } from '../types/jwk';
import { KeyWithPrivateBackupDto } from '../keys/dto/create-key.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // async findAll(): Promise<SafeUser[]> {
  //   return this.prisma.user.findMany({
  //     select: {
  //       id: true,
  //       name: true,
  //       email: true,
  //       phone: true,
  //       isOnline: true,
  //       lastSeen: true,
  //       createdAt: true,
  //       updatedAt: true,
  //     },
  //     include: {

  //     }
  //   });
  // }

  async findById(id: string) {
    if (!id) {
      throw new NotFoundException('Не указан ID пользователя');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return user;
  }

  async findByEmail(email: string) {
    if (!email) return null;
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByPhone(phone: string) {
    if (!phone) return null;
    return this.prisma.user.findUnique({ where: { phone } });
  }

  async create(data: {
    email?: string;
    phone: string;
    password: string;
    name?: string;
    publicKeyJwk?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  }) {
    if (!data.email && !data.phone) {
      throw new BadRequestException('Требуется email или телефон');
    }
    try {
      const user = await this.prisma.user.create({
        data: {
          email: data.email ?? '',
          phone: data.phone,
          password: data.password,
          name: data.name ?? '',
          publicKeyJwk: data.publicKeyJwk
            ? (data.publicKeyJwk as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
      return user;
    } catch (e: any) {
      if (e?.code === 'P2002' && e?.meta?.target) {
        throw new ConflictException(`${e.meta.target.join(', ')} уже используется`);
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    if (!id) {
      throw new BadRequestException('ID пользователя обязателен');
    }
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.avatar !== undefined) data.avatar = dto.avatar;

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async setOnlineStatus(userId: string, isOnline: boolean) {
    if (!userId) {
      throw new BadRequestException('ID пользователя обязателен');
    }
    const data: any = { isOnline };
    if (!isOnline) data.lastSeen = new Date();
    else data.lastSeen = null;

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return updatedUser;
  }

  async updateKeys(id: string, body: KeyWithPrivateBackupDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        publicKeyJwk: body.publicKeyJwk
          ? (body.publicKeyJwk as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        privateKeyJwk: body.privateKeyBackup
          ? (body.privateKeyBackup as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }
  async getKeysWithPrivateBackup(id: string): Promise<KeyWithPrivateBackupDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        privateKeyJwk: true,
        publicKeyJwk: true,
      },
    });

    if (!user) throw new NotFoundException('Пользователь не найден');

    return {
      publicKeyJwk: user.publicKeyJwk as JsonWebKey,
      privateKeyBackup: user.privateKeyJwk as JsonWebKeyPrivate,
    } satisfies KeyWithPrivateBackupDto;
  }
  async getPublicKey(id: string): Promise<{ publicKeyJwk: JsonWebKey | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        publicKeyJwk: true,
      },
    });

    if (!user) throw new NotFoundException('Пользователь не найден');

    return {
      publicKeyJwk: user.publicKeyJwk as JsonWebKey | null,
    };
  }
}
