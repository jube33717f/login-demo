import { generateKeyPairSync, sign } from 'node:crypto';
import type { KeyObject } from 'node:crypto';

import { UnauthorizedException } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';

import { TokenValidatorService } from '../../src/auth/token-validator.service';
import { ConfigService } from '../../src/config/config.service';
import { OidcDiscoveryService } from '../../src/auth/oidc-discovery.service';

const jwksUri = 'https://idp.example.test/.well-known/jwks.json';
const keyId = 'test-key';

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createToken(payload: Record<string, unknown>, privateKey: KeyObject) {
  const encodedHeader = base64url(
    JSON.stringify({ alg: 'RS256', kid: keyId, typ: 'JWT' }),
  );
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = sign('RSA-SHA256', Buffer.from(signingInput), privateKey);

  return `${signingInput}.${base64url(signature)}`;
}

describe('TokenValidatorService', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 1024,
  });
  const jwk = publicKey.export({ format: 'jwk' });

  const discovery = {
    getConfiguration: jest.fn().mockResolvedValue({
      issuer: 'auth.dev.leap.services',
      jwks_uri: jwksUri,
    }),
  } as unknown as OidcDiscoveryService;

  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'oidc.clientId': 'PVLUM9TIKCASF2BG',
      };

      return values[key];
    }),
  } as unknown as ConfigService;

  const loggerMock = {
    setContext: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
  const logger = loggerMock as unknown as PinoLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [{ ...jwk, kid: keyId, alg: 'RS256' }] }),
    } as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('validates an RS256 ID token signed by the IdP JWKS key', async () => {
    const service = new TokenValidatorService(config, discovery, logger);
    const token = createToken(
      {
        sub: 'user-1',
        iss: 'auth.dev.leap.services',
        aud: 'PVLUM9TIKCASF2BG',
        exp: Math.floor(Date.now() / 1000) + 600,
      },
      privateKey,
    );

    await expect(service.validateIdToken(token)).resolves.toMatchObject({
      user: { sub: 'user-1' },
    });
  });

  it('rejects a token with a tampered payload', async () => {
    const service = new TokenValidatorService(config, discovery, logger);
    const token = createToken(
      {
        sub: 'user-1',
        iss: 'auth.dev.leap.services',
        aud: 'PVLUM9TIKCASF2BG',
        exp: Math.floor(Date.now() / 1000) + 600,
      },
      privateKey,
    );
    const [header, , signature] = token.split('.');
    const tamperedPayload = base64url(
      JSON.stringify({
        sub: 'user-2',
        iss: 'auth.dev.leap.services',
        aud: 'PVLUM9TIKCASF2BG',
        exp: Math.floor(Date.now() / 1000) + 600,
      }),
    );

    await expect(
      service.validateIdToken(`${header}.${tamperedPayload}.${signature}`),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
