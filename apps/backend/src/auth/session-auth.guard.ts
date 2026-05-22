import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { ConfigService } from '../config/config.service';
import { SessionStoreService } from './session-store.service';
import type { AuthSession } from './types';

type CookieRequest = Request & {
  cookies?: Record<string, string | undefined>;
  user?: AuthSession['user'];
  authSession?: AuthSession;
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly sessions: SessionStoreService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CookieRequest>();
    const sid = request.cookies?.[this.config.get('session.cookieName')];
    const session = await this.sessions.get(sid);

    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }

    request.user = session.user;
    request.authSession = session;

    return true;
  }
}
