import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { DataModule } from './data/data.module';

@Module({
  imports: [ConfigModule, AuthModule, DataModule],
})
export class AppModule {}
