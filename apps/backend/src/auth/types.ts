export type OidcConfiguration = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
};

export type LoginTransaction = {
  state: string;
  codeVerifier: string;
  createdAt: number;
  expiresAt: number;
  redirectAfterLogin: string;
};

export type TokenResponse = {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
};

export type ValidatedUser = {
  sub: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  claims: Record<string, unknown>;
};

export type AuthSession = {
  id: string;
  user: ValidatedUser;
  accessToken: string;
  idToken: string;
  createdAt: number;
  expiresAt: number;
};
