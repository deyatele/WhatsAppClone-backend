import { PickType } from '@nestjs/swagger';
import { LoginDto } from './login.dto';

export class ValidatePasswordDto extends PickType(LoginDto, ['password'] as const) {}
