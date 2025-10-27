import { Injectable } from '@nestjs/common';

@Injectable()
export class TurnCredentialsService {
  async getCredentials(userId: string) {
    const res = await fetch(`http://159.255.32.18:3030/turn-credentials/${userId}`);
    return await res.json();
  }
}
