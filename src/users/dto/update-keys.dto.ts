import { IsNotEmpty, IsObject } from 'class-validator';
import type { JsonWebKey, JsonWebKeyPrivate } from '../../types/jwk';

export class UpdateKeysDto {
  @IsObject()
  @IsNotEmpty()
  publicKeyJwk: JsonWebKey;

  @IsObject()
  @IsNotEmpty()
  privateKeyBackup: JsonWebKeyPrivate;
}
