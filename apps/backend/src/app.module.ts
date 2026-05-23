import type { IncomingMessage, ServerResponse } from 'node:http';

import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';

import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { DataModule } from './data/data.module';

type RequestForLogging = IncomingMessage & { id?: unknown };

function requestSummary(request: RequestForLogging) {
  return {
    id: request.id,
    method: request.method,
    url: request.url?.split('?')[0],
    remoteAddress: request.socket.remoteAddress,
    remotePort: request.socket.remotePort,
  };
}

function responseSummary(
  response: ServerResponse,
  value: Record<string, unknown>,
) {
  const loggedResponse = value.res as { statusCode?: number } | undefined;

  return {
    statusCode: loggedResponse?.statusCode ?? response.statusCode,
  };
}

@Module({
  imports: [
    ConfigModule,
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('logging.level'),
          redact: {
            paths: [
              'req.url',
              'req.query',
              'req.headers',
              'res.headers',
            ],
            censor: '[redacted]',
          },
          customProps: () => ({ service: config.get('service') }),
          customSuccessObject: (request, response, value) => ({
            ...value,
            req: undefined,
            route: requestSummary(request),
            res: responseSummary(response, value),
          }),
          customErrorObject: (request, response, error, value) => ({
            ...value,
            req: undefined,
            route: requestSummary(request),
            res: responseSummary(response, value),
            err: {
              type: error.name,
              message: error.message,
              stack: error.stack,
            },
          }),
          transport: config.get('logging.pretty')
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'SYS:standard',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
        },
      }),
    }),
    AuthModule,
    DataModule,
  ],
})
export class AppModule {}
