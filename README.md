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

Backend environment defaults live in `apps/backend/.env.example`.

```bash
APP_PORT=3000
FRONTEND_ORIGIN=http://localhost:4200
OIDC_DISCOVERY_URL=https://auth.dev.leap.services/.well-known/openid-configuration
OIDC_CLIENT_ID=PVLUM9TIKCASF2BG
OIDC_REDIRECT_URI=http://localhost:4200/callback
OIDC_SCOPES=openid profile email
SESSION_COOKIE_NAME=sid
SESSION_TTL_SECONDS=3600
SESSION_SECURE_COOKIE=false
SESSION_STORE=redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
OAUTH_TRANSACTION_TTL_SECONDS=600
```

Frontend environment defaults live in `apps/frontend/.env.example`.

```bash
VITE_APP_BASE_URL=http://localhost:4200
VITE_API_BASE_URL=
VITE_E2E=false
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

## Test Account

Use an IdP test account provided through the interview instructions or your secure team channel. Do not commit usernames, passwords, or e2e-specific env files to this repository.

## Notes and Tradeoffs

- Redis is used because OAuth transactions and sessions are short-lived security state with clear TTL behavior.
- A relational database is not used for sessions because this data is not business data and does not need relational querying.
- Refresh token rotation is out of scope. Sessions expire with the token lifetime or fallback session TTL.
- IdP global logout is out of scope. `POST /logout` clears only the local application session.
- Public deployment is intentionally not configured because the allowed IdP redirect URIs have not been confirmed.
