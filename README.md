# OAuth PKCE Demo

This repository implements an enterprise interview exercise for OAuth 2.0 / OIDC authentication using the Authorization Code flow with PKCE.

The project is a pnpm workspace with two applications:

- `apps/frontend`: Vite, React, TypeScript, CSS Modules
- `apps/backend`: NestJS, TypeScript, Redis-backed session and OAuth transaction storage

The browser entry point is always:

```text
http://localhost:4200
```

## Features

- Starts an Authorization Code + PKCE flow with `GET /login`
- Handles the IdP callback at `GET /callback`
- Exchanges the authorization code for tokens
- Validates ID tokens with JWKS, issuer, audience, and expiration checks
- Stores OAuth state and sessions in Redis with TTL
- Exposes `GET /me` for the authenticated user
- Exposes `GET /api/data` as a protected API route
- Returns `401 Unauthorized` for unauthenticated protected requests
- Keeps tokens out of browser URLs, localStorage, and sessionStorage

## Requirements

- Node.js 20+
- pnpm 10+
- Docker Desktop, for Redis and optional full-stack Docker mode

## Workspace Scripts

```bash
pnpm install
pnpm docker:redis
pnpm dev:backend
pnpm dev:frontend
```

Useful scripts:

```bash
pnpm build:backend
pnpm build:frontend
pnpm test:backend
pnpm test:frontend
pnpm test:e2e:backend
pnpm test:e2e:frontend
pnpm docker:up
pnpm docker:down
```

## Environment

Environment files are intentionally simple for this demo. Each app has one checked-in example file and one local runtime file:

- `apps/backend/.env.example`: backend template committed to the repository
- `apps/backend/.env`: backend local runtime values used by NestJS and Docker Compose
- `apps/frontend/.env.example`: frontend template committed to the repository
- `apps/frontend/.env`: frontend local runtime values used by Vite and Docker Compose

Do not commit secrets, passwords, personal test accounts, or e2e-only env files. Use `.env.local` for local-only overrides when needed. The repository ignores `.env.local`, `.env.e2e`, and `.env.e2e.local` files.

Backend environment defaults live in `apps/backend/.env.example`.

```bash
SERVICE=oauth-pkce-demo-api
APP_PORT=3000
FRONTEND_ORIGIN=http://localhost:4200
OIDC_DISCOVERY_URL=https://auth.dev.leap.services/.well-known/openid-configuration
OIDC_CLIENT_ID=PVLUM9TIKCASF2BG
OIDC_REDIRECT_URI=
OIDC_SCOPES=openid profile email
SESSION_COOKIE_NAME=sid
SESSION_TTL_SECONDS=3600
SESSION_SECURE_COOKIE=false
SESSION_STORE=redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
OAUTH_TRANSACTION_TTL_SECONDS=600
```

Backend variables:

| Variable | Purpose |
| --- | --- |
| `SERVICE` | Service name used for logging and diagnostics. |
| `APP_PORT` | Backend HTTP port. Local development uses `3000`. |
| `FRONTEND_ORIGIN` | Allowed browser origin for CORS and redirects. Local development uses `http://localhost:4200`. |
| `OIDC_DISCOVERY_URL` | IdP OIDC discovery document URL. |
| `OIDC_CLIENT_ID` | Public OAuth client ID registered with the IdP. |
| `OIDC_REDIRECT_URI` | Optional explicit redirect URI. Leave empty for the provided interview IdP so it can use the client default redirect URI. Set it only when the IdP confirms an exact allowed callback URL. |
| `OIDC_SCOPES` | Space-separated OAuth scopes requested during login. |
| `SESSION_COOKIE_NAME` | HttpOnly session cookie name. |
| `SESSION_TTL_SECONDS` | Session TTL used by Redis or the in-memory fallback. |
| `SESSION_SECURE_COOKIE` | Set to `true` behind HTTPS in production-like environments. Use `false` for local HTTP development. |
| `SESSION_STORE` | Session backend. Use `redis` for normal local development. `memory` is only for isolated tests. |
| `REDIS_URL` | Redis connection URL. Local Docker Redis uses `redis://localhost:6379`; full Docker mode uses `redis://redis:6379`. |
| `REDIS_PASSWORD` | Redis password when the Redis instance requires authentication. Leave empty for the provided local Docker Redis. |
| `OAUTH_TRANSACTION_TTL_SECONDS` | TTL for short-lived OAuth state and PKCE transaction data. |

For the provided interview IdP, `OIDC_REDIRECT_URI` is intentionally empty. The assignment gives the discovery URL and client ID, but does not provide an exact registered callback URL. Probing the IdP shows that explicitly sending `http://localhost:4200/callback` returns `403 Forbidden`, while omitting `redirect_uri` lets the IdP use the client default and proceed to authentication.

Frontend environment defaults live in `apps/frontend/.env.example`.

```bash
VITE_APP_BASE_URL=http://localhost:4200
VITE_API_BASE_URL=
VITE_E2E=false
```

Frontend variables:

| Variable | Purpose |
| --- | --- |
| `VITE_APP_BASE_URL` | Browser-facing frontend origin. Local development uses `http://localhost:4200`. |
| `VITE_API_BASE_URL` | API base URL used by the frontend. Leave empty when Vite proxies API requests to the backend. |
| `VITE_E2E` | Enables frontend test-only UI behavior when explicitly set to `true`. Keep `false` for normal development. |

For local setup, copy the example files once and adjust values only if your IdP registration or ports differ:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

## Development Mode

Recommended day-to-day development uses Docker only for Redis. Run the API and frontend apps locally so NestJS logs, Vite logs, breakpoints, and hot reload remain easy to inspect.

Terminal 1:

```bash
pnpm docker:redis
docker compose logs -f redis
```

Terminal 2:

```bash
pnpm dev:backend
```

Terminal 3:

```bash
pnpm dev:frontend
```

Open:

```text
http://localhost:4200
```

## Full Docker Mode

The repository also provides a full-stack Docker mode for one-command review.

```bash
pnpm docker:up
```

This starts:

- `redis` on port `6379`
- `backend` on port `3000`
- `frontend` on port `4200`

View logs:

```bash
docker compose logs -f frontend backend redis
```

Stop everything:

```bash
pnpm docker:down
```

## Redis

Redis stores short-lived OAuth and session data:

```text
oauth:state:<state>
session:<sid>
```

The application sets TTLs for both key types. No manual Redis setup is required.

Check Redis health:

```bash
docker compose exec redis redis-cli ping
```

Expected output:

```text
PONG
```

## OAuth Flow

1. The user opens `http://localhost:4200`.
2. The user clicks `Login`.
3. The frontend app navigates to `/login`.
4. The API generates `state`, `code_verifier`, and `code_challenge`.
5. The API stores the login transaction in Redis.
6. The API redirects the browser to the IdP authorization endpoint.
7. The IdP redirects back to `/callback?code=...&state=...`.
8. The API validates and consumes `state`.
9. The API exchanges the code with the original `code_verifier`.
10. The API validates the ID token signature and claims.
11. The API creates a Redis-backed session and sets an HttpOnly cookie.
12. The frontend app calls `/me` and `/api/data`.

## Token Storage

Access tokens and ID tokens are stored only in the server-side Redis session. The browser stores only an HttpOnly session cookie.

This avoids exposing tokens through:

- URLs
- localStorage
- sessionStorage
- frontend JavaScript

Local development uses HTTP, so `SESSION_SECURE_COOKIE=false`. Production environments must use HTTPS and secure cookies.

## Testing

Backend unit tests:

```bash
pnpm test:backend
```

Backend e2e tests:

```bash
pnpm test:e2e:backend
```

Frontend unit tests:

```bash
pnpm test:frontend
```

Frontend Playwright tests:

```bash
pnpm test:e2e:frontend
```

## E2E Login Strategy

The ideal e2e login strategy is to avoid any long-lived shared username and password. If the IdP supports user provisioning through an admin API, test API, SCIM, or another approved enterprise user management path, full login e2e tests should:

1. Create a short-lived test user before the test run.
2. Use that generated account only for the current test run.
3. Delete or disable the test user during teardown.
4. Store any IdP provisioning credentials only in the CI secret store or a local-only `.env.local` file.

This repository does not implement user registration, and the current IdP provisioning capability is not part of the project scope. Because e2e tests should not require manual account setup on every run, the temporary strategy for real IdP login coverage is to use one dedicated test account managed outside the repository.

That temporary account must not be committed to source control. Store its username and password only in CI secrets or a local-only `.env.local` file, rotate it when access changes, and keep it limited to the minimum permissions required for login testing.

The current Playwright suite includes two frontend e2e paths:

- `auth-flow.spec.ts` verifies the anonymous application state with network stubbing. This keeps local e2e tests deterministic.
- `real-login.spec.ts` performs a real browser login against the IdP when local credentials are provided.

To run the real login test locally, create `apps/frontend/.env.local` with a dedicated test account managed outside the repository:

```bash
E2E_REAL_LOGIN=false
E2E_LOGIN_USERNAME=
E2E_LOGIN_PASSWORD=
```

The real login test is opt-in. Keep `E2E_REAL_LOGIN=false` for normal automated runs. Set it to `true` only when intentionally validating the live IdP in Playwright UI. Do not commit this file or these values.

The provided interview IdP also has two practical constraints observed during local validation: explicitly sending a localhost `redirect_uri` returns `403 Forbidden`, so this app leaves `OIDC_REDIRECT_URI` empty and lets the IdP use the client default; automated form submission may still be blocked by the IdP's live anti-automation controls. The deterministic e2e path remains `auth-flow.spec.ts`.

## Notes and Tradeoffs

- Redis is used because OAuth transactions and sessions are short-lived security state with clear TTL behavior.
- A relational database is not used for sessions because this data is not business data and does not need relational querying.
- Refresh token rotation is out of scope. Sessions expire with the token lifetime or fallback session TTL.
- IdP global logout is out of scope. `POST /logout` clears only the local application session.
- Public deployment is intentionally not configured because the allowed IdP redirect URIs have not been confirmed.
