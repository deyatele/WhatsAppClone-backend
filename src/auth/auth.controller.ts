import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwkValidationPipe } from '../keys/jwk.validation.pipe';
import { ValidatePasswordDto } from './dto/validate-password.dto';
import { AuthUser } from './user.decorator';
import { JwtAuthGuard } from './jwt.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Пользователь успешно зарегистрирован' })
  async register(@Body(new JwkValidationPipe()) body: RegisterDto) {
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

  @Post('validate-password')
  @UseGuards(JwtAuthGuard)
  @ApiBody({ type: ValidatePasswordDto })
  @ApiResponse({ status: 200, description: 'Пароль успешно проверен', type: Boolean })
  async validatePassword(@AuthUser('id') userId: string, @Body() body: ValidatePasswordDto) {
    return this.auth.validatePassword(userId, body.password);
  }
}
