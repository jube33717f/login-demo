import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { registerApp } from './app.register';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  registerApp(app);

  const config = app.get(ConfigService);
  const port = config.get('port');
  await app.listen(port);
}

void bootstrap();
