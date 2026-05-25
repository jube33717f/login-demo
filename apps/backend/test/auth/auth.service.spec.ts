import { AuthService } from '../../src/auth/auth.service';
import type { AuthSession } from '../../src/auth/types';
import { ConfigService } from '../../src/config/config.service';

describe('AuthService', () => {
  it('builds an IdP logout URL from discovery', async () => {
    const config = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          'frontend.origin': 'http://localhost:4200',
        };

        return values[key];
      }),
    } as unknown as ConfigService;
    const discovery = {
      getConfiguration: jest.fn().mockResolvedValue({
        end_session_endpoint: 'https://auth.example.test/oauth/logout',
      }),
    };
    const service = new AuthService(
      config,
      {} as never,
      discovery as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { setContext: jest.fn() } as never,
    );
    const session = {
      idToken: 'id-token',
    } as AuthSession;

    await expect(service.buildLogoutUrl(session)).resolves.toBe(
      'https://auth.example.test/oauth/logout',
    );
  });

  it('builds a logout completion page that returns home', () => {
    const service = new AuthService(
      {} as ConfigService,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { setContext: jest.fn() } as never,
    );

    expect(
      service.buildLogoutCompletionPage('https://auth.example.test/oauth/logout'),
    ).toContain("window.location.replace('/')");
  });
});
