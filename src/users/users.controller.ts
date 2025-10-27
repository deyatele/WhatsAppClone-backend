import { 
  Controller, 
  Get, 
  Patch, 
  Body, 
  UseGuards, 
  Req, 
  BadRequestException 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiBearerAuth, 
  ApiBody, 
  ApiResponse 
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { SafeUser } from '../types';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // @Get()
  // @ApiResponse({ status: 200, description: 'Список всех пользователей' })
  // async getAll(): Promise<SafeUser[]> {
  //   return this.users.findAll();
  // }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiResponse({ status: 200, description: 'Информация о текущем пользователе' })
  async getMe(
    @Req() req: Request & { user: { userId: string } },
  ): Promise<SafeUser | null> {
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
}
