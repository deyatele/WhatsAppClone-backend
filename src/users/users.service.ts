import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SafeUser } from '../types';

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

  async create(data: { email?: string; phone: string; password: string; name?: string }) {
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
        avatar:true,
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
        avatar:true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return updatedUser;
  }
}
