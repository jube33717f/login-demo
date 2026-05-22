import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OidcDiscoveryService } from './oidc-discovery.service';
import { PkceService } from './pkce.service';
import { RedisClientService } from './redis-client.service';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionStoreService } from './session-store.service';
import { StateStoreService } from './state-store.service';
import { TokenValidatorService } from './token-validator.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OidcDiscoveryService,
    PkceService,
    RedisClientService,
    SessionAuthGuard,
    SessionStoreService,
    StateStoreService,
    TokenValidatorService,
  ],
  exports: [SessionAuthGuard, SessionStoreService],
})
export class AuthModule {}
