import { BadGatewayException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { ConfigService } from '../config/config.service';
import type { OidcConfiguration } from './types';

@Injectable()
export class OidcDiscoveryService {
  private cached?: { value: OidcConfiguration; expiresAt: number };

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {}

  async getConfiguration(): Promise<OidcConfiguration> {
    if (this.cached && this.cached.expiresAt > Date.now()) {
      return this.cached.value;
    }

    try {
      const { data } = await firstValueFrom(
        this.http.get<OidcConfiguration>(this.config.get('oidc.discoveryUrl')),
      );

      this.assertConfiguration(data);
      this.cached = {
        value: data,
        expiresAt: Date.now() + 60 * 60 * 1000,
      };

      return data;
    } catch (error) {
      throw new BadGatewayException('Failed to load OIDC configuration');
    }
  }

  private assertConfiguration(value: OidcConfiguration): void {
    const required: Array<keyof OidcConfiguration> = [
      'issuer',
      'authorization_endpoint',
      'token_endpoint',
      'jwks_uri',
    ];

    for (const key of required) {
      if (!value[key]) {
        throw new Error(`OIDC discovery missing ${key}`);
      }
    }
  }
}
