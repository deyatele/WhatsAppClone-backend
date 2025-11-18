import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const sslKeyPath = process.env.SSL_KEY_PATH || path.join(process.cwd(), 'certs', 'key.pem');
  const sslCertPath = process.env.SSL_CERT_PATH || path.join(process.cwd(), 'certs', 'cert.pem');

  const hasCerts = fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);

  const httpsOptions = hasCerts
    ? {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      }
    : undefined;

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    httpsOptions ? { httpsOptions } : {},
  );

  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('WhatsApp-like API')
    .setDescription('API for WhatsApp-like app (NestJS + Prisma + Socket.IO)')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  await app.listen(port);

  console.log(
    `${hasCerts ? 'HTTPS' : 'HTTP'} Server running on port ${port} — Swagger: ${hasCerts ? 'https' : 'http'}://localhost:${port}/docs`,
  );

  if (!hasCerts)
    console.warn('⚠️ HTTPS not enabled — cert files not found in', sslKeyPath, sslCertPath);
}

bootstrap();
