import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Пользователь успешно зарегистрирован' })
  async register(@Body() body: RegisterDto) {
    return this.auth.register(body);
  }

  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Успешный вход и получение токенов' })
  async login(@Body() body: LoginDto) {
    const user = await this.auth.validateUser(body.identifier, body.password);
    if (!user) return { error: 'Invalid credentials' };
    return this.auth.login(user);
  }

  @Post('refresh')
  @ApiBody({ schema: { example: { refreshToken: 'token123' } } })
  @ApiResponse({ status: 200, description: 'Выдача нового accessToken' })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.auth.refresh(body.refreshToken);
  }
}
