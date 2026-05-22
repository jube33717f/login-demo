import { ConfigService } from '../../src/config/config.service';
import { PkceService } from '../../src/auth/pkce.service';
import { RedisClientService } from '../../src/auth/redis-client.service';
import { StateStoreService } from '../../src/auth/state-store.service';

function createConfigMock(ttlSeconds = 600): ConfigService {
  return {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        'session.store': 'memory',
        'oauthTransaction.ttlSeconds': ttlSeconds,
      };

      return values[key];
    }),
  } as unknown as ConfigService;
}

describe('StateStoreService', () => {
  it('consumes a state only once', async () => {
    const service = new StateStoreService(
      createConfigMock(),
      new PkceService(),
      {} as RedisClientService,
    );

    const transaction = await service.create({
      codeVerifier: 'verifier',
      redirectAfterLogin: '/',
    });

    await expect(service.consume(transaction.state)).resolves.toEqual(
      transaction,
    );
    await expect(service.consume(transaction.state)).resolves.toBeNull();
  });

  it('rejects expired state', async () => {
    const service = new StateStoreService(
      createConfigMock(-1),
      new PkceService(),
      {} as RedisClientService,
    );

    const transaction = await service.create({
      codeVerifier: 'verifier',
      redirectAfterLogin: '/',
    });

    await expect(service.consume(transaction.state)).resolves.toBeNull();
  });
});
