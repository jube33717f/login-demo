import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

function base64url(input: Buffer): string {
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

@Injectable()
export class PkceService {
  createVerifier(): string {
    return base64url(randomBytes(32));
  }

  createChallenge(verifier: string): string {
    return base64url(createHash('sha256').update(verifier).digest());
  }

  createState(): string {
    return base64url(randomBytes(32));
  }

  createSessionId(): string {
    return base64url(randomBytes(32));
  }
}
