import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters';
import { LoggingInterceptor } from './common/interceptors';
import { CacheHeadersInterceptor } from './common/interceptors/cache-headers.interceptor';
import { initSentry } from './common/sentry';

async function bootstrap() {
  // Initialize Sentry error tracking (requires SENTRY_DSN env var)
  initSentry();
  const isProduction = process.env.NODE_ENV === 'production';

  const winstonLogger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: isProduction
          ? winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            )
          : winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: 'HH:mm:ss' }),
              winston.format.printf(({ timestamp, level, message, context }) =>
                `${timestamp} [${context || 'App'}] ${level}: ${message}`,
              ),
            ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 30,
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 30,
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, { logger: winstonLogger });
  const logger = new Logger('Bootstrap');

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // disabled for Swagger UI
    }),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global request logging
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global cache headers (ETag, Cache-Control, Last-Modified)
  app.useGlobalInterceptors(new CacheHeadersInterceptor(new Reflector()));

  // CORS
  app.enableCors();

  // Swagger API docs
  const config = new DocumentBuilder()
    .setTitle('REKI API')
    .setDescription('REKI - Manchester Nightlife Discovery App Backend API')
    .setVersion('1.0.4')
    .addBearerAuth()
    .addTag('App', 'App config & health check')
    .addTag('Auth', 'User authentication (email, Google, Apple, guest)')
    .addTag('Users', 'User profile & preferences')
    .addTag('Venues', 'Venue discovery, detail, map markers')
    .addTag('Offers', 'Offer details, claim, redeem, Apple Wallet')
    .addTag('Notifications', 'User notifications')
    .addTag('Tags', 'Vibe & music tags')
    .addTag('Business', 'Business portal (dashboard, status, offers)')
    .addTag('Admin', 'Admin view-only APIs')
    .addTag('Devices', 'Device registration & notification preferences')
    .addTag('Live', 'Real-time updates (WebSocket + SSE fallback)')
    .addTag('Sync', 'Offline sync, delta sync, state persistence')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT || '3000', 10);

  try {
    await app.listen(port);
    logger.log(`🚀 REKI Backend running on http://localhost:${port}`);
    logger.log(`📄 Swagger Docs: http://localhost:${port}/api/docs`);
  } catch (err: any) {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${port} is already in use. Set a different PORT in .env or stop the existing process.`);
      process.exit(1);
    }
    throw err;
  }
}
bootstrap();
