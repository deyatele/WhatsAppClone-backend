import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { UsersModule } from '../users/users.module';
import type { JwtModuleOptions } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (cfg: ConfigService): Promise<JwtModuleOptions> => {
        const secret = cfg.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET environment variable is not set');
        }

        const expiresIn = cfg.get<string>('JWT_EXPIRES_IN') || '15m';

        // Функция для преобразования строкового формата времени в секунды
        const parseTime = (timeStr: string): number => {
          const match = timeStr.match(/^(\d+)([smhdw])$/);
          if (!match) {
            // Если формат не распознан, возвращаем как есть (если это число)
            const num = Number(timeStr);
            if (!isNaN(num)) return num;
            throw new Error(`Invalid time format: ${timeStr}`);
          }

          const [, amount, unit] = match;
          const value = parseInt(amount!, 10);

          switch (unit) {
            case 's':
              return value; // seconds
            case 'm':
              return value * 60; // minutes
            case 'h':
              return value * 3600; // hours
            case 'd':
              return value * 86400; // days
            case 'w':
              return value * 604800; // weeks
            default:
              return value;
          }
        };

        let expiresInValue: number = 900; // по умолчанию 15 минут
        if (typeof expiresIn === 'string') {
          try {
            expiresInValue = parseTime(expiresIn);
          } catch {
            // Если не удалось распознать формат, используем стандартное значение
            expiresInValue = 900; // 15 минут в секундах
          }
        }

        return {
          secret,
          signOptions: { expiresIn: expiresInValue },
        };
      },
    }),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
