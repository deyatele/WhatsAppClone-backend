import { Module } from '@nestjs/common';
import { TurnCredentialsService } from './turn-credentials.service';
import { TurnCredentialsController } from './turn-credentials.controller';

@Module({
  controllers: [TurnCredentialsController],
  providers: [TurnCredentialsService],
})
export class TurnCredentialsModule {}
