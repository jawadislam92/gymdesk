import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // Versioned REST API: every controller route is served under /api/v1.
  app.setGlobalPrefix('api/v1');

  // Validate all incoming DTOs against their zod schemas.
  app.useGlobalPipes(new ZodValidationPipe());

  // CORS for the web/desktop/mobile clients.
  // Local dev (no CORS_ORIGIN set): reflect any origin so localhost just works.
  // Production: set CORS_ORIGIN to a comma-separated allowlist, e.g.
  //   CORS_ORIGIN=https://app.yourgym.com,https://admin.yourgym.com
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : true;
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // OpenAPI / Swagger docs at /api/docs (outside the version prefix).
  const swaggerConfig = new DocumentBuilder()
    .setTitle('GymFlow Suite API')
    .setDescription('gymflow-api — REST API for GymFlow Suite')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT ?? 4000);
  await app.listen({ port, host: '0.0.0.0' });
  Logger.log(`gymflow-api listening on http://localhost:${port} (docs: /api/docs)`, 'Bootstrap');
}

void bootstrap();
