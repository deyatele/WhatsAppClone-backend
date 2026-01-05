import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('health')
export class HealthController {
  @Get()
  async getHealth(@Res() res: Response) {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }
}
