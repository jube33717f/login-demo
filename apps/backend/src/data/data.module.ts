import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DataController } from './data.controller';

@Module({
  imports: [AuthModule],
  controllers: [DataController],
})
export class DataModule {}
