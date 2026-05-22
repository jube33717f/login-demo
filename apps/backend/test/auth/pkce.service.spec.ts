import { createHash } from 'node:crypto';

import { PkceService } from '../../src/auth/pkce.service';

function base64url(input: Buffer): string {
  return input
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

describe('PkceService', () => {
  const service = new PkceService();

  it('creates unique PKCE verifiers', () => {
    const first = service.createVerifier();
    const second = service.createVerifier();

    expect(first).not.toEqual(second);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first.length).toBeGreaterThanOrEqual(43);
  });

  it('creates an S256 challenge from a verifier', () => {
    const verifier = 'test-verifier';
    const expected = base64url(createHash('sha256').update(verifier).digest());

    expect(service.createChallenge(verifier)).toEqual(expected);
  });
});
