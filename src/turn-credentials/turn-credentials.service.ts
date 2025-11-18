import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TurnCredentialsService {
  constructor(private readonly configService: ConfigService) {}

  async getCredentials(userId: string) {
    const turnProviderUrl = this.configService.get<string>('TURN_PROVIDER_URL');
    const res = await fetch(`${turnProviderUrl}/${userId}`);
    return await res.json();
  }
}
