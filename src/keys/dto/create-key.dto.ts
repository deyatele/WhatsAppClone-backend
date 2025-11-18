import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import type { JsonWebKey, JsonWebKeyPrivate } from '../../types/jwk';

export class PrivateKeyBackupDto {
  @IsString()
  @IsNotEmpty()
  privateKeyBackup: JsonWebKeyPrivate;
}

export class PublicKeyDto {
  @IsObject()
  @IsNotEmpty()
  publicKeyJwk: JsonWebKey;
}

export class KeyWithPrivateBackupDto {
  @IsObject()
  @IsNotEmpty()
  publicKeyJwk: JsonWebKey;

  @IsObject()
  @IsNotEmpty()
  privateKeyBackup: JsonWebKeyPrivate;
}
