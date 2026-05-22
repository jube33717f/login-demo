import { Injectable } from '@nestjs/common';

import { ConfigService } from '../config/config.service';
import { PkceService } from './pkce.service';
import { RedisClientService } from './redis-client.service';
import type { LoginTransaction } from './types';

@Injectable()
export class StateStoreService {
  private readonly memoryStore = new Map<string, LoginTransaction>();

  constructor(
    private readonly config: ConfigService,
    private readonly pkce: PkceService,
    private readonly redis: RedisClientService,
  ) {}

  async create(input: {
    codeVerifier: string;
    redirectAfterLogin: string;
  }): Promise<LoginTransaction> {
    const now = Date.now();
    const ttlSeconds = this.config.get('oauthTransaction.ttlSeconds');
    const transaction: LoginTransaction = {
      state: this.pkce.createState(),
      codeVerifier: input.codeVerifier,
      createdAt: now,
      expiresAt: now + ttlSeconds * 1000,
      redirectAfterLogin: input.redirectAfterLogin,
    };

    if (this.config.get('session.store') === 'redis') {
      await this.redis
        .getClient()
        .set(this.key(transaction.state), JSON.stringify(transaction), {
          EX: ttlSeconds,
        });
    } else {
      this.memoryStore.set(transaction.state, transaction);
    }

    return transaction;
  }

  async consume(state: string): Promise<LoginTransaction | null> {
    if (this.config.get('session.store') === 'redis') {
      const raw = await this.redis.getClient().sendCommand<string | null>([
        'GETDEL',
        this.key(state),
      ]);

      return raw ? this.parse(raw) : null;
    }

    const transaction = this.memoryStore.get(state) ?? null;
    this.memoryStore.delete(state);

    if (!transaction || transaction.expiresAt <= Date.now()) {
      return null;
    }

    return transaction;
  }

  private key(state: string): string {
    return `oauth:state:${state}`;
  }

  private parse(raw: string): LoginTransaction | null {
    const transaction = JSON.parse(raw) as LoginTransaction;
    if (transaction.expiresAt <= Date.now()) {
      return null;
    }

    return transaction;
  }
}
