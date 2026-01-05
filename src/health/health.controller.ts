import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('health')
export class HealthController {
  @Get()
  async getHealth(@Res() res: Response) {
    console.log('Health check called!');
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }
}
