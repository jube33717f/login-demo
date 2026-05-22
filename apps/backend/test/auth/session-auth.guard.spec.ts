import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { SessionAuthGuard } from '../../src/auth/session-auth.guard';
import { SessionStoreService } from '../../src/auth/session-store.service';
import { ConfigService } from '../../src/config/config.service';

function createContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('SessionAuthGuard', () => {
  const config = {
    get: jest.fn(() => 'sid'),
  } as unknown as ConfigService;

  it('rejects requests without a valid session', async () => {
    const sessions = {
      get: jest.fn().mockResolvedValue(null),
    } as unknown as SessionStoreService;
    const guard = new SessionAuthGuard(config, sessions);

    await expect(
      guard.canActivate(createContext({ cookies: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('adds user and session to authenticated requests', async () => {
    const session = {
      id: 'session-id',
      user: { sub: 'user-1', claims: { sub: 'user-1' } },
      accessToken: 'access-token',
      idToken: 'id-token',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
    };
    const sessions = {
      get: jest.fn().mockResolvedValue(session),
    } as unknown as SessionStoreService;
    const request: Record<string, unknown> = { cookies: { sid: 'session-id' } };
    const guard = new SessionAuthGuard(config, sessions);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user).toEqual(session.user);
    expect(request.authSession).toEqual(session);
  });
});
