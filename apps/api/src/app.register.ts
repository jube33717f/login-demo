import cookieParser from 'cookie-parser';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { ConfigService } from './config/config.service';

export function registerApp(app: NestExpressApplication): void {
  const config = app.get(ConfigService);

  app.use(cookieParser());
  app.enableCors({
    origin: config.get('frontend.origin'),
    credentials: true,
  });
}
