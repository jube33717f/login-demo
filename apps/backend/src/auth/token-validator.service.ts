import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { PinoLogger } from 'nestjs-pino';

import { ConfigService } from '../config/config.service';
import { OidcDiscoveryService } from './oidc-discovery.service';
import type { ValidatedUser } from './types';

@Injectable()
export class TokenValidatorService {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;
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

    if (!this.jwks || this.jwksUri !== oidc.jwks_uri) {
      this.jwksUri = oidc.jwks_uri;
      this.jwks = createRemoteJWKSet(new URL(oidc.jwks_uri));
      this.logger.debug({ jwksUri: oidc.jwks_uri }, 'Created remote JWKS verifier');
    }

    try {
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: oidc.issuer,
        audience: this.config.get('oidc.clientId'),
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
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.warn(this.errorContext(error), 'ID token validation failed');
      throw new UnauthorizedException('Invalid ID token');
    }
  }

  private stringClaim(payload: JWTPayload, claim: string): string | undefined {
    const value = payload[claim];
    return typeof value === 'string' ? value : undefined;
  }

  private errorContext(error: unknown): Record<string, unknown> {
    if (typeof error !== 'object' || error === null) {
      return { error };
    }

    const maybeError = error as { message?: string; code?: string };
    return { message: maybeError.message, code: maybeError.code };
  }
}
