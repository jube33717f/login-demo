import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { registerApp } from './app.register';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  registerApp(app);

  const config = app.get(ConfigService);
  await app.listen(config.get('port'));
}

void bootstrap();
