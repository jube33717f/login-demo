import { BadGatewayException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PinoLogger } from 'nestjs-pino';
import { firstValueFrom } from 'rxjs';

import { ConfigService } from '../config/config.service';
import type { OidcConfiguration } from './types';

@Injectable()
export class OidcDiscoveryService {
  private cached?: { value: OidcConfiguration; expiresAt: number };

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OidcDiscoveryService.name);
  }

  async getConfiguration(): Promise<OidcConfiguration> {
    if (this.cached && this.cached.expiresAt > Date.now()) {
      return this.cached.value;
    }

    const discoveryUrl = this.config.get('oidc.discoveryUrl');

    try {
      const { data } = await firstValueFrom(
        this.http.get<OidcConfiguration>(discoveryUrl),
      );

      this.assertConfiguration(data);
      this.cached = {
        value: data,
        expiresAt: Date.now() + 60 * 60 * 1000,
      };

      this.logger.info(
        {
          discoveryUrl,
          issuer: data.issuer,
          authorizationEndpoint: data.authorization_endpoint,
          tokenEndpoint: data.token_endpoint,
        },
        'Loaded OIDC discovery configuration',
      );

      return data;
    } catch (error) {
      this.logger.error(this.errorContext(error), 'Failed to load OIDC configuration');
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

  private errorContext(error: unknown): Record<string, unknown> {
    if (typeof error !== 'object' || error === null) {
      return { error };
    }

    const maybeHttpError = error as {
      message?: string;
      code?: string;
      response?: { status?: number; data?: unknown };
    };

    return {
      message: maybeHttpError.message,
      code: maybeHttpError.code,
      responseStatus: maybeHttpError.response?.status,
      responseData: maybeHttpError.response?.data,
    };
  }
}
