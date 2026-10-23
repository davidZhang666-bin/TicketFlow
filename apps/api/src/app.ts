import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json } from 'express';
import type { Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { CONFIG, loadConfig } from './config.js';
import type { Config } from './config.js';
import { ErrorFilter, requestBodyErrors } from './http.js';
import type { AppRequest } from './http.js';
import { Resources } from './resources.js';
import { HealthController } from './health.js';
import { Sessions } from './auth/sessions.js';
import { AuthGuard, OrganizerGuard } from './auth/guards.js';
import { AuthController } from './auth/controller.js';
import { Events } from './events/service.js';
import { PublicEventsController, OrganizerEventsController } from './events/controller.js';

@Module({})
class RootModule {}
export async function createApp(config: Config = loadConfig(), quiet = false) {
  const app = await NestFactory.create(
    {
      module: RootModule,
      controllers: [
        HealthController,
        AuthController,
        PublicEventsController,
        OrganizerEventsController,
      ],
      providers: [
        { provide: CONFIG, useValue: config },
        Resources,
        Sessions,
        AuthGuard,
        OrganizerGuard,
        Events,
      ],
    },
    { bodyParser: false, logger: quiet ? false : ['error', 'warn', 'log'] },
  );
  app.setGlobalPrefix('api/v1');
  app.use((request: AppRequest, response: Response, next: () => void) => {
    const supplied = request.headers['x-request-id'];
    request.requestId =
      typeof supplied === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(supplied)
        ? supplied
        : randomUUID();
    response.setHeader('X-Request-Id', request.requestId);
    const start = performance.now();
    response.on('finish', () => {
      if (!quiet && !request.path.includes('/health/'))
        console.info(
          JSON.stringify({
            event: 'http_request',
            requestId: request.requestId,
            method: request.method,
            path: request.path,
            status: response.statusCode,
            durationMs: Math.round(performance.now() - start),
          }),
        );
    });
    next();
  });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(json({ limit: '32kb' }));
  app.use(requestBodyErrors);
  app.use(cookieParser());
  app.use(
    '/api/v1/auth/login',
    rateLimit({
      windowMs: 15 * 60_000,
      limit: 20,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (request: AppRequest, response: Response) =>
        response.status(429).json({
          code: 'RATE_LIMITED',
          message: '登录尝试过于频繁，请稍后重试。',
          requestId: request.requestId,
        }),
    }),
  );
  app.enableCors({
    origin: config.APP_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalFilters(new ErrorFilter());
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('TicketFlow API')
      .setVersion('0.1.0')
      .setDescription('Day 1: sessions and activity management.')
      .addCookieAuth('tf_session')
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: '/api/docs/openapi.json' });
  return { app, document };
}
