import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { SafeUser } from '../types';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private cfg: ConfigService,
  ) {}

  async validateUser(identifier: string, password: string) {
    const user = identifier.includes('@')
      ? await this.usersService.findByEmail(identifier)
      : await this.usersService.findByPhone(identifier);

    if (!user) throw new UnauthorizedException('Логин или пароль неверны');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Логин или пароль неверны');

    const { password: _, ...safeUser } = user;
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
}
