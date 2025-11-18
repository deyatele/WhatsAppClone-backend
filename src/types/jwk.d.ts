export interface JsonWebKey {
  kty?: string;
  use?: string;
  key_ops?: string[];
  alg?: string;
  ext?: boolean;
  kid?: string;
  x5u?: string;
  x5c?: string[];
  x5t?: string;
  'x5t#S256'?: string;
  n?: string; // RSA modulus
  e?: string; // RSA public exponent
  d?: string; // RSA private exponent
  p?: string; // RSA first prime factor
  q?: string; // RSA second prime factor
  dp?: string; // RSA first factor CRT exponent
  dq?: string; // RSA second factor CRT exponent
  qi?: string; // RSA first CRT coefficient
  oth?: Array<{ r: string; d: string; t: string }>;
  crv?: string; // EC curve
  x?: string; // EC x coordinate
  y?: string; // EC y coordinate
}

export interface JsonWebKeyPrivate {
  encryptedPrivateKeyB64?: string;
  ivB64?: string;
  saltB64?: string;
  iterations?: string;
}
