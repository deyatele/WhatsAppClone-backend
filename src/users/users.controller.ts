import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  Put,
  Param,
  UnauthorizedException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateKeysDto } from './dto/update-keys.dto';
import type { SafeUser } from '../types';
import { KeyWithPrivateBackupDto } from '../keys/dto/create-key.dto';
import { AuthUser } from '../auth/user.decorator';
import { JwkValidationPipe } from '../keys/jwk.validation.pipe';
import { JsonWebKey } from '../types/jwk';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiResponse({ status: 200, description: 'Список всех пользователей' })
  async getAll(): Promise<SafeUser[]> {
    return this.users.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Информация о текущем пользователе' })
  async getMe(@Req() req: Request & { user: { userId: string } }): Promise<SafeUser | null> {
    return this.users.findById(req.user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'Обновлённый профиль пользователя' })
  async updateMe(
    @Req() req: Request & { user: { userId: string } },
    @Body() body: UpdateUserDto,
  ): Promise<UpdateUserDto | null> {
    try {
      return await this.users.update(req.user.userId, body);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Ошибка обновления профиля',
      );
    }
  }

  //Обновление ключей пользователя
  @Put(':id/keys')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: UpdateKeysDto })
  @ApiResponse({ status: 200, description: 'Ключи обновлены' })
  async updateKeys(
    @Param('id', ParseUUIDPipe) id: string,
    @AuthUser('id') userId: string,
    @Body(new JwkValidationPipe()) body: UpdateKeysDto,
  ) {
    if (id !== userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.users.updateKeys(id, body);
  }

  //Получение ключей пользователя с приватным ключом
  @Get(':id/keys')
  @UseGuards(JwtAuthGuard)
  async getKeys(
    @Param('id') id: string,
    @AuthUser('id') userId: string,
  ): Promise<KeyWithPrivateBackupDto> {
    if (id !== userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    return this.users.getKeysWithPrivateBackup(id);
  }

  //Получение публичного ключа пользователя
  @Get(':id/public-key')
  @UseGuards(JwtAuthGuard)
  async getPublicKey(@Param('id') id: string): Promise<{ publicKeyJwk: JsonWebKey | null }> {
    return this.users.getPublicKey(id);
  }
}
