import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { createClient, type RedisClientType } from 'redis';

import { ConfigService } from '../config/config.service';

@Injectable()
export class RedisClientService implements OnModuleInit, OnApplicationShutdown {
  private client?: RedisClientType;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RedisClientService.name);
  }

  async onModuleInit(): Promise<void> {
    if (this.config.get('session.store') !== 'redis') {
      this.logger.info('Redis session store disabled');
      return;
    }

    this.client = createClient({
      url: this.config.get('redis.url'),
      password: this.config.get('redis.password') || undefined,
    });

    this.client.on('error', (error) => {
      this.logger.error({ message: error.message }, 'Redis client error');
    });

    await this.client.connect();
    this.logger.info({ redisUrl: this.config.get('redis.url') }, 'Connected to Redis');
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client?.isOpen) {
      await this.client.quit();
      this.logger.info('Redis connection closed');
    }
  }

  getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis client is not initialized');
    }

    return this.client;
  }
}
