import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';

import { ConfigService } from '../config/config.service';

@Injectable()
export class RedisClientService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisClientService.name);
  private client?: RedisClientType;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get('session.store') !== 'redis') {
      return;
    }

    this.client = createClient({
      url: this.config.get('redis.url'),
      password: this.config.get('redis.password') || undefined,
    });

    this.client.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });

    await this.client.connect();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }

  getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis client is not initialized');
    }

    return this.client;
  }
}
