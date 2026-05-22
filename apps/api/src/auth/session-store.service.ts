import { Injectable } from '@nestjs/common';

import { ConfigService } from '../config/config.service';
import { PkceService } from './pkce.service';
import { RedisClientService } from './redis-client.service';
import type { AuthSession, ValidatedUser } from './types';

@Injectable()
export class SessionStoreService {
  private readonly memoryStore = new Map<string, AuthSession>();

  constructor(
    private readonly config: ConfigService,
    private readonly pkce: PkceService,
    private readonly redis: RedisClientService,
  ) {}

  async create(input: {
    user: ValidatedUser;
    accessToken: string;
    idToken: string;
    expiresAt?: number;
  }): Promise<AuthSession> {
    const now = Date.now();
    const fallbackExpiresAt = now + this.config.get('session.ttlSeconds') * 1000;
    const session: AuthSession = {
      id: this.pkce.createSessionId(),
      user: input.user,
      accessToken: input.accessToken,
      idToken: input.idToken,
      createdAt: now,
      expiresAt: input.expiresAt ?? fallbackExpiresAt,
    };

    await this.set(session);
    return session;
  }

  async get(id?: string): Promise<AuthSession | null> {
    if (!id) {
      return null;
    }

    const session =
      this.config.get('session.store') === 'redis'
        ? await this.getFromRedis(id)
        : this.memoryStore.get(id) ?? null;

    if (!session || session.expiresAt <= Date.now()) {
      await this.delete(id);
      return null;
    }

    return session;
  }

  async delete(id?: string): Promise<void> {
    if (!id) {
      return;
    }

    if (this.config.get('session.store') === 'redis') {
      await this.redis.getClient().del(this.key(id));
    } else {
      this.memoryStore.delete(id);
    }
  }

  private async set(session: AuthSession): Promise<void> {
    const ttlSeconds = Math.max(
      1,
      Math.floor((session.expiresAt - Date.now()) / 1000),
    );

    if (this.config.get('session.store') === 'redis') {
      await this.redis.getClient().set(this.key(session.id), JSON.stringify(session), {
        EX: ttlSeconds,
      });
    } else {
      this.memoryStore.set(session.id, session);
    }
  }

  private async getFromRedis(id: string): Promise<AuthSession | null> {
    const raw = await this.redis.getClient().get(this.key(id));
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  }

  private key(id: string): string {
    return `session:${id}`;
  }
}
