import { Controller, Get, Param, UseGuards, UnauthorizedException } from '@nestjs/common';
import { KeysService } from './keys.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AuthUser } from '../auth/user.decorator';

@Controller('users')
export class KeysController {
  constructor(private readonly keysService: KeysService) {}

  @Get(':id/publicKey')
  getPublicKey(@Param('id') id: string) {
    return this.keysService.getPublicKey(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/keysBackup')
  getKeysBackup(@Param('id') id: string, @AuthUser('id') userId: string) {
    const targetId = id === 'me' ? userId : id;
    if (targetId !== userId) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.keysService.getKeysBackup(targetId);
  }
}
