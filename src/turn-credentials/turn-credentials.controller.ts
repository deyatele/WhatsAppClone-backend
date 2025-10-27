import { Controller, Get, Param, Req } from '@nestjs/common';
import { TurnCredentialsService } from './turn-credentials.service';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Turn Credentials')
@ApiBearerAuth('access-token')
@Controller('turn-credentials')
export class TurnCredentialsController {
  constructor(private readonly turnCredentialsService: TurnCredentialsService) {}

  @Get(':id')
  @ApiResponse({ status: 200, description: 'TURN credentials for the authenticated user' })
  async getCredentials(@Param('id') id: string) {
     return await this.turnCredentialsService.getCredentials(id);
  }
}
