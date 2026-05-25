import { createPublicKey, verify } from 'node:crypto';
import type { JsonWebKey } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  decodeJwt,
  decodeProtectedHeader,
  type JWTPayload,
  type JWK,
} from 'jose';
import { PinoLogger } from 'nestjs-pino';

import { ConfigService } from '../config/config.service';
import { OidcDiscoveryService } from './oidc-discovery.service';
import type { ValidatedUser } from './types';

@Injectable()
export class TokenValidatorService {
  private jwks?: JWK[];
  private jwksUri?: string;

  constructor(
    private readonly config: ConfigService,
    private readonly discovery: OidcDiscoveryService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(TokenValidatorService.name);
  }

  async validateIdToken(idToken: string): Promise<{
    user: ValidatedUser;
    payload: JWTPayload;
  }> {
    const oidc = await this.discovery.getConfiguration();

    try {
      const payload = await this.verifySignature(idToken, oidc.jwks_uri);
      this.validateClaims(payload, {
        audience: this.config.get('oidc.clientId'),
        issuer: oidc.issuer,
      });

      const sub = this.stringClaim(payload, 'sub');
      if (!sub) {
        throw new UnauthorizedException('ID token missing sub claim');
      }

      this.logger.info({ issuer: oidc.issuer, audience: this.config.get('oidc.clientId'), userSub: sub }, 'Validated ID token');

      return {
        payload,
        user: {
          sub,
          email: this.stringClaim(payload, 'email'),
          name: this.stringClaim(payload, 'name'),
          given_name: this.stringClaim(payload, 'given_name'),
          family_name: this.stringClaim(payload, 'family_name'),
          claims: payload,
        },
      };
    } catch (error) {
      this.logger.warn(
        this.errorContext(error, idToken, {
          expectedAudience: this.config.get('oidc.clientId'),
          expectedIssuer: oidc.issuer,
        }),
        'ID token validation failed',
      );
      throw new UnauthorizedException('Invalid ID token');
    }
  }

  private stringClaim(payload: JWTPayload, claim: string): string | undefined {
    const value = payload[claim];
    return typeof value === 'string' ? value : undefined;
  }

  private async verifySignature(
    idToken: string,
    jwksUri: string,
  ): Promise<JWTPayload> {
    const [encodedHeader, encodedPayload, encodedSignature] = idToken.split('.');
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new UnauthorizedException('ID token is not a JWT');
    }

    const header = decodeProtectedHeader(idToken);
    if (header.alg !== 'RS256') {
      throw new UnauthorizedException('Unsupported ID token algorithm');
    }

    const keys = await this.getJwks(jwksUri);
    const jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
    if (!jwk) {
      throw new UnauthorizedException('ID token signing key not found');
    }

    const publicKey = createPublicKey({ key: jwk as JsonWebKey, format: 'jwk' });
    const isValidSignature = verify(
      'RSA-SHA256',
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      publicKey,
      Buffer.from(encodedSignature, 'base64url'),
    );
    if (!isValidSignature) {
      throw new UnauthorizedException('Invalid ID token signature');
    }

    return decodeJwt(idToken);
  }

  private async getJwks(jwksUri: string): Promise<JWK[]> {
    if (this.jwks && this.jwksUri === jwksUri) {
      return this.jwks;
    }

    const response = await fetch(jwksUri);
    if (!response.ok) {
      throw new UnauthorizedException('Unable to load JWKS');
    }

    const body = (await response.json()) as { keys?: JWK[] };
    if (!Array.isArray(body.keys)) {
      throw new UnauthorizedException('JWKS response missing keys');
    }

    this.jwksUri = jwksUri;
    this.jwks = body.keys;
    this.logger.debug({ jwksUri }, 'Loaded remote JWKS');

    return this.jwks;
  }

  private validateClaims(
    payload: JWTPayload,
    expected: { audience: string; issuer: string },
  ): void {
    if (payload.iss !== expected.issuer) {
      throw new UnauthorizedException('ID token issuer mismatch');
    }

    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(expected.audience)) {
      throw new UnauthorizedException('ID token audience mismatch');
    }

    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp <= now) {
      throw new UnauthorizedException('ID token expired');
    }
  }

  private errorContext(
    error: unknown,
    idToken: string,
    expected: { expectedAudience: string; expectedIssuer: string },
  ): Record<string, unknown> {
    const context: Record<string, unknown> = { ...expected };

    try {
      const header = decodeProtectedHeader(idToken);
      const payload = decodeJwt(idToken);

      context.tokenAlg = header.alg;
      context.tokenKid = header.kid;
      context.tokenIssuer = payload.iss;
      context.tokenAudience = payload.aud;
      context.tokenExpiresAt =
        typeof payload.exp === 'number'
          ? new Date(payload.exp * 1000).toISOString()
          : undefined;
    } catch {
      context.tokenShape = 'unreadable';
    }

    if (typeof error !== 'object' || error === null) {
      return { ...context, error };
    }

    const maybeError = error as { message?: string; code?: string };
    return { ...context, message: maybeError.message, code: maybeError.code };
  }
}
