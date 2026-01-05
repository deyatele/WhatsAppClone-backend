import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  async getHealth() {
    console.log('Health check called!');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
