import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

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
  ) {}

  async validateIdToken(idToken: string): Promise<{
    user: ValidatedUser;
    payload: JWTPayload;
  }> {
    const oidc = await this.discovery.getConfiguration();

    if (!this.jwks || this.jwksUri !== oidc.jwks_uri) {
      this.jwksUri = oidc.jwks_uri;
      this.jwks = createRemoteJWKSet(new URL(oidc.jwks_uri));
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

      throw new UnauthorizedException('Invalid ID token');
    }
  }

  private stringClaim(payload: JWTPayload, claim: string): string | undefined {
    const value = payload[claim];
    return typeof value === 'string' ? value : undefined;
  }
}
