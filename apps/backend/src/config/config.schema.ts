import type { Schema } from 'convict';

const schema = (<T>(config: Schema<T>) => config)({
  service: {
    doc: 'Service name',
    format: String,
    default: 'oauth-pkce-demo-api',
    env: 'SERVICE',
  },
  port: {
    doc: 'Port number',
    format: 'port',
    default: 3000,
    env: 'APP_PORT',
  },
  frontend: {
    origin: {
      doc: 'Frontend origin',
      format: 'url',
      default: 'http://localhost:4200',
      env: 'FRONTEND_ORIGIN',
    },
  },
  oidc: {
    discoveryUrl: {
      doc: 'OIDC discovery document URL',
      format: 'url',
      default: 'https://auth.dev.leap.services/.well-known/openid-configuration',
      env: 'OIDC_DISCOVERY_URL',
    },
    clientId: {
      doc: 'OIDC client id',
      format: 'non-empty-string',
      default: 'PVLUM9TIKCASF2BG',
      env: 'OIDC_CLIENT_ID',
    },
    redirectUri: {
      doc: 'OIDC redirect URI. Leave empty to let the IdP use the client default redirect URI.',
      format: String,
      default: '',
      env: 'OIDC_REDIRECT_URI',
    },
    scopes: {
      doc: 'OIDC scopes',
      format: String,
      default: 'openid profile email',
      env: 'OIDC_SCOPES',
    },
  },
  session: {
    cookieName: {
      doc: 'Session cookie name',
      format: 'non-empty-string',
      default: 'sid',
      env: 'SESSION_COOKIE_NAME',
    },
    ttlSeconds: {
      doc: 'Fallback session TTL in seconds',
      format: 'int',
      default: 3600,
      env: 'SESSION_TTL_SECONDS',
    },
    secureCookie: {
      doc: 'Use Secure cookie flag',
      format: Boolean,
      default: false,
      env: 'SESSION_SECURE_COOKIE',
    },
    store: {
      doc: 'Session store implementation',
      format: ['redis', 'memory'],
      default: 'redis',
      env: 'SESSION_STORE',
    },
  },
  redis: {
    url: {
      doc: 'Redis connection URL',
      format: String,
      default: 'redis://localhost:6379',
      env: 'REDIS_URL',
    },
    password: {
      doc: 'Redis password',
      format: String,
      default: '',
      env: 'REDIS_PASSWORD',
      sensitive: true,
    },
  },
  oauthTransaction: {
    ttlSeconds: {
      doc: 'OAuth state transaction TTL in seconds',
      format: 'int',
      default: 600,
      env: 'OAUTH_TRANSACTION_TTL_SECONDS',
    },
  },
});

export default schema;
