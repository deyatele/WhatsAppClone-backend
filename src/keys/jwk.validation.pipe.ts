import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { Buffer } from 'buffer';
import type { JsonWebKey, JsonWebKeyPrivate } from '../types/jwk';

@Injectable()
export class JwkValidationPipe implements PipeTransform {
  transform(
    value: { id: string; publicKeyJwk?: JsonWebKey; privateKeyBackup: JsonWebKeyPrivate },
    metadata: ArgumentMetadata,
  ) {
    if (metadata.type !== 'body') {
      return value;
    }

    const { publicKeyJwk, privateKeyBackup } = value;

    if (publicKeyJwk) {
      if (typeof publicKeyJwk !== 'object' || publicKeyJwk === null) {
        throw new BadRequestException('publicKeyJwk must be an object.');
      }

      const { kty, n, e, use, key_ops } = publicKeyJwk;

      if (kty !== 'RSA') {
        throw new BadRequestException('Invalid JWK: kty must be RSA.');
      }

      if (!n || !e) {
        throw new BadRequestException('Invalid JWK: n and e are required.');
      }

      if (publicKeyJwk.d || publicKeyJwk.p || publicKeyJwk.q) {
        throw new BadRequestException('Invalid JWK: private key parameters are not allowed.');
      }

      if (use && use !== 'enc') {
        throw new BadRequestException('Invalid JWK: use must be enc.');
      }

      if (
        key_ops &&
        (!Array.isArray(key_ops) || (!key_ops.includes('encrypt') && !key_ops.includes('wrapKey')))
      ) {
        throw new BadRequestException(
          'Invalid JWK: key_ops must be an array containing encrypt or wrapKey.',
        );
      }

      const modulusLength = Buffer.from(n, 'base64url').length * 8;
      if (modulusLength < 2048) {
        throw new BadRequestException('Invalid JWK: modulusLength must be at least 2048.');
      }
    }

    if (privateKeyBackup) {
      if (typeof privateKeyBackup !== 'object' || privateKeyBackup === null) {
        throw new BadRequestException('privateKeyBackup must be an object.');
      }

      const { encryptedPrivateKeyB64, ivB64, saltB64, iterations } = privateKeyBackup;

      if (!encryptedPrivateKeyB64 || typeof encryptedPrivateKeyB64 !== 'string') {
        throw new BadRequestException(
          'Invalid privateKeyBackup: encryptedPrivateKeyB64 is required and must be a string.',
        );
      }

      if (!ivB64 || typeof ivB64 !== 'string') {
        throw new BadRequestException(
          'Invalid privateKeyBackup: ivB64 is required and must be a string.',
        );
      }

      if (!saltB64 || typeof saltB64 !== 'string') {
        throw new BadRequestException(
          'Invalid privateKeyBackup: saltB64 is required and must be a string.',
        );
      }

      if (!iterations || typeof iterations !== 'string' || !/^\d+$/.test(iterations)) {
        throw new BadRequestException(
          'Invalid privateKeyBackup: iterations is required and must be a string representing a number.',
        );
      }
    }

    return value;
  }
}
