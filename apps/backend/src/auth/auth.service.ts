import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PinoLogger } from 'nestjs-pino';
import { firstValueFrom } from 'rxjs';

import { ConfigService } from '../config/config.service';
import { OidcDiscoveryService } from './oidc-discovery.service';
import { PkceService } from './pkce.service';
import { SessionStoreService } from './session-store.service';
import { StateStoreService } from './state-store.service';
import { TokenValidatorService } from './token-validator.service';
import type { AuthSession, TokenResponse } from './types';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly discovery: OidcDiscoveryService,
    private readonly pkce: PkceService,
    private readonly stateStore: StateStoreService,
    private readonly sessionStore: SessionStoreService,
    private readonly tokenValidator: TokenValidatorService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async buildAuthorizationUrl(): Promise<string> {
    const oidc = await this.discovery.getConfiguration();
    const codeVerifier = this.pkce.createVerifier();
    const codeChallenge = this.pkce.createChallenge(codeVerifier);
    const transaction = await this.stateStore.create({
      codeVerifier,
      redirectAfterLogin: '/',
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.get('oidc.clientId'),
      scope: this.config.get('oidc.scopes'),
      state: transaction.state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });
    const redirectUri = this.config.get('oidc.redirectUri');
    if (redirectUri) {
      params.set('redirect_uri', redirectUri);
    }

    this.logger.info(
      {
        authorizationEndpoint: oidc.authorization_endpoint,
        clientId: this.config.get('oidc.clientId'),
        scopes: this.config.get('oidc.scopes'),
        usesExplicitRedirectUri: Boolean(redirectUri),
      },
      'Building OIDC authorization URL',
    );

    return `${oidc.authorization_endpoint}?${params.toString()}`;
  }

  async handleCallback(query: {
    code?: string;
    state?: string;
    error?: string;
  }): Promise<AuthSession> {
    this.logger.info(
      {
        hasCode: Boolean(query.code),
        hasState: Boolean(query.state),
        hasError: Boolean(query.error),
      },
      'Handling OIDC callback',
    );

    if (query.error) {
      this.logger.warn({ oidcError: query.error }, 'OIDC callback returned an error');
      throw new BadRequestException('OIDC authorization failed');
    }

    if (!query.code) {
      throw new BadRequestException('Missing authorization code');
    }

    if (!query.state) {
      throw new BadRequestException('Missing state');
    }

    const transaction = await this.stateStore.consume(query.state);
    if (!transaction) {
      throw new BadRequestException('Invalid or expired state');
    }

    const tokenResponse = await this.exchangeCode({
      code: query.code,
      codeVerifier: transaction.codeVerifier,
    });

    const { user, payload } = await this.tokenValidator.validateIdToken(
      tokenResponse.id_token,
    );

    const session = await this.sessionStore.create({
      user,
      accessToken: tokenResponse.access_token,
      idToken: tokenResponse.id_token,
      expiresAt:
        typeof payload.exp === 'number' ? payload.exp * 1000 : undefined,
    });

    this.logger.info(
      {
        userSub: user.sub,
        sessionExpiresAt: new Date(session.expiresAt).toISOString(),
      },
      'Created authenticated session',
    );

    return session;
  }

  async buildLogoutUrl(session: AuthSession | null): Promise<string | null> {
    if (!session) {
      return null;
    }

    const oidc = await this.discovery.getConfiguration();
    if (!oidc.end_session_endpoint) {
      return null;
    }

    return oidc.end_session_endpoint;
  }

  buildLogoutCompletionPage(logoutUrl: string): string {
    const escapedLogoutUrl = JSON.stringify(logoutUrl);

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Signing out</title>
  </head>
  <body>
    <iframe src=${escapedLogoutUrl} hidden aria-hidden="true"></iframe>
    <script>
      const returnHome = () => window.location.replace('/');
      window.setTimeout(returnHome, 1200);
      document.querySelector('iframe').addEventListener('load', returnHome, { once: true });
    </script>
  </body>
</html>`;
  }

  private async exchangeCode(input: {
    code: string;
    codeVerifier: string;
  }): Promise<TokenResponse> {
    const oidc = await this.discovery.getConfiguration();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.get('oidc.clientId'),
      code: input.code,
      code_verifier: input.codeVerifier,
    });
    const redirectUri = this.config.get('oidc.redirectUri');
    if (redirectUri) {
      body.set('redirect_uri', redirectUri);
    }

    this.logger.debug(
      {
        tokenEndpoint: oidc.token_endpoint,
        usesExplicitRedirectUri: Boolean(redirectUri),
      },
      'Exchanging authorization code for tokens',
    );

    try {
      const { data } = await firstValueFrom(
        this.http.post<TokenResponse>(oidc.token_endpoint, body.toString(), {
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      if (!data.access_token || !data.id_token) {
        throw new UnauthorizedException('Token endpoint returned invalid data');
      }

      return data;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(this.errorContext(error), 'Token exchange failed');
      throw new BadGatewayException('Token exchange failed');
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
