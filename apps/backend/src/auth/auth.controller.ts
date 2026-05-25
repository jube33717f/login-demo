import {
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Redirect,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import type { RequestWithAuth } from '../common/types/request-with-auth';
import { ConfigService } from '../config/config.service';
import { AuthService } from './auth.service';
import { SessionAuthGuard } from './session-auth.guard';
import { SessionStoreService } from './session-store.service';

@Controller()
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly sessions: SessionStoreService,
  ) {}

  @Get('/login')
  async login(@Res() response: Response): Promise<void> {
    response.redirect(await this.auth.buildAuthorizationUrl());
  }

  @Get('/callback')
  async callback(
    @Query() query: { code?: string; state?: string; error?: string },
    @Res() response: Response,
  ): Promise<void> {
    const session = await this.auth.handleCallback(query);

    response.cookie(this.config.get('session.cookieName'), session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('session.secureCookie'),
      path: '/',
      maxAge: Math.max(1, session.expiresAt - Date.now()),
    });
    response.redirect('/');
  }

  @UseGuards(SessionAuthGuard)
  @Get('/me')
  me(@Req() request: RequestWithAuth) {
    return request.user;
  }

  @Post('/logout')
  @HttpCode(200)
  async logout(@Req() request: Request, @Res() response: Response) {
    const cookieName = this.config.get('session.cookieName');
    const sid = request.cookies?.[cookieName];

    await this.sessions.delete(sid);
    response.clearCookie(cookieName, { path: '/' });
    response.json({ ok: true });
  }

  @Get('/logout')
  async browserLogout(@Req() request: Request, @Res() response: Response) {
    const cookieName = this.config.get('session.cookieName');
    const sid = request.cookies?.[cookieName];
    const session = await this.sessions.get(sid);
    const logoutUrl = await this.auth.buildLogoutUrl(session);

    await this.sessions.delete(sid);
    response.clearCookie(cookieName, { path: '/' });

    if (!logoutUrl) {
      response.redirect('/');
      return;
    }

    response.type('html').send(this.auth.buildLogoutCompletionPage(logoutUrl));
  }
}
