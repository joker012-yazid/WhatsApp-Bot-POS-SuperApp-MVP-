import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { json } from 'express';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { PiiRedactionMiddleware } from './common/pii-redaction.middleware';
import { ValidationPipe } from '@nestjs/common';
import { readSecret } from './common/secret.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });

  const origin = process.env.CORS_ORIGIN || 'https://whatsappbot.laptoppro.my';

  app.enableCors({
    origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  });

  app.use(helmet());
  const cookieSecret =
    readSecret('SESSION_COOKIE_SECRET', { fallback: 'change-me-too' }) ?? 'change-me-too';
  app.use(cookieParser(cookieSecret));
  app.use(json({ limit: '10mb' }));
  const piiMiddleware = new PiiRedactionMiddleware();
  app.use(piiMiddleware.use.bind(piiMiddleware));
  app.use(
    pinoHttp({
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { translateTime: true } }
          : undefined,
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.body.accessToken',
        'res.body.refreshToken',
        'res.body.user.email',
        'res.body.user.phone'
      ],
      serializers: {
        req(req) {
          return {
            method: req.method,
            url: req.url,
            params: req.params,
            query: req.query,
            body: (req as any).sanitizedBody
          };
        }
      },
      customProps: (req) => ({ service: 'api', requestId: req.headers['x-request-id'] })
    })
  );

  app.useGlobalFilters(new ApiExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true }
    })
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);
}

bootstrap();
