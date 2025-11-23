import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import type { RegisterDto } from './dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Prisma, type User } from '@prisma/client';
import type { SafeUser } from '../types';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private cfg: ConfigService,
  ) {}

  async validateUser(identifier: string, password: string): Promise<Omit<User, 'password'>> {
    const user = identifier.includes('@')
      ? await this.usersService.findByEmail(identifier)
      : await this.usersService.findByPhone(identifier);

    if (!user) throw new UnauthorizedException('Логин или пароль неверны');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Логин или пароль неверны');

    const safeUser: Omit<User, 'password'> = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      publicKeyJwk: user.publicKeyJwk,
      privateKeyJwk: user.privateKeyJwk,
    };
    return safeUser;
  }

  async login(user: SafeUser) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.cfg.get('JWT_EXPIRES_IN') || '15m',
    });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const days = parseInt(this.cfg.get('REFRESH_TOKEN_EXPIRES_DAYS') || '30', 10);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken, user };
  }

  async register(dto: RegisterDto): Promise<SafeUser> {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const newUser = await this.usersService.create({
      email: dto.email ?? '',
      phone: dto.phone,
      password: hashedPassword,
      name: dto.name ?? '',
      publicKeyJwk: dto.publicKeyJwk as Prisma.InputJsonValue,
      privateKeyJwk: dto.privateKeyJwk as Prisma.InputJsonValue,
    });

    return newUser;
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string; email: string }>(refreshToken);
      const dbToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      });

      if (!dbToken || dbToken.userId !== payload.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (dbToken.expiresAt.getTime() < Date.now()) {
        await this.prisma.refreshToken.delete({ where: { id: dbToken.id } });
        throw new UnauthorizedException('Refresh token expired');
      }

      const user = await this.usersService.findById(payload.sub);
      if (!user) throw new UnauthorizedException('Invalid refresh token');

      const newAccessToken = this.jwtService.sign(
        { sub: user.id, email: user.email },
        { expiresIn: this.cfg.get('JWT_EXPIRES_IN') || '15m' },
      );

      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async revokeRefreshToken(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { ok: true };
  }

  async validatePassword(userId: string, password: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const result = await bcrypt.compare(password, user.password);
    if (!result) throw new UnauthorizedException('Пароль не верный');
    return result;
  }

  async verifyUser(token: string): Promise<SafeUser> {
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);
      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Пользователь из токена не найден.');
      }
      return user;
    } catch {
      throw new UnauthorizedException('Невалидный или просроченный токен.');
    }
  }
}
