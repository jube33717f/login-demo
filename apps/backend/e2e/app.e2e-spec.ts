import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { registerApp } from '../src/app.register';
import { SessionStoreService } from '../src/auth/session-store.service';

describe('API e2e', () => {
  let app: NestExpressApplication;
  let sessions: SessionStoreService;

  beforeAll(async () => {
    process.env.SESSION_STORE = 'memory';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    registerApp(app);
    await app.init();
    sessions = app.get(SessionStoreService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 401 for unauthenticated /me requests', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
  });

  it('returns 401 for unauthenticated protected data requests', async () => {
    await request(app.getHttpServer()).get('/api/data').expect(401);
  });

  it('returns user and protected data for an authenticated session', async () => {
    const session = await sessions.create({
      user: {
        sub: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        claims: { sub: 'user-1' },
      },
      accessToken: 'access-token',
      idToken: 'id-token',
    });

    await request(app.getHttpServer())
      .get('/me')
      .set('Cookie', [`sid=${session.id}`])
      .expect(200)
      .expect(({ body }) => {
        expect(body.sub).toBe('user-1');
      });

    await request(app.getHttpServer())
      .get('/api/data')
      .set('Cookie', [`sid=${session.id}`])
      .expect(200)
      .expect(({ body }) => {
        expect(body.items).toHaveLength(2);
      });
  });

  it('rejects callback requests without code', async () => {
    await request(app.getHttpServer()).get('/callback?state=state').expect(400);
  });
});
