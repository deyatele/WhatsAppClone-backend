import { HttpExceptionFilter } from './common/filters/http-exception.filter';
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
  const isProduction = process.env.NODE_ENV === 'production';

  let httpsOptions = {};
  if (!isProduction) {
    const sslKeyPath = process.env.SSL_KEY_PATH || path.join(process.cwd(), 'certs', 'key.pem');
    const sslCertPath = process.env.SSL_CERT_PATH || path.join(process.cwd(), 'certs', 'cert.pem');

    const hasCerts = fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);

    if (hasCerts) {
      httpsOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      };
    } else {
      console.warn('⚠️ HTTPS not enabled — cert files not found in', sslKeyPath, sslCertPath);
    }
  }
  const silentLogger = {
    log: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    verbose: () => {},
  };
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    httpsOptions: httpsOptions,
    // logger: silentLogger,
  });

  const corsOptions = {
    origin: process.env.FRONTEND_URL || 'https://localhost',
    credentials: true,
  };
  app.setGlobalPrefix('api');
  app.enableCors(corsOptions);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  app.get('/test', (req, res) => {
    res.send('OK');
  });
  // Swagger документация только для разработки
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Расскажи и ...')
      .setDescription('API Расскажи и ... app (NestJS + Prisma + Socket.IO)')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
    console.log(
      `${httpsOptions ? 'HTTPS' : 'HTTP'} Server running on port ${port} — Swagger: ${httpsOptions ? 'https' : 'http'}://localhost:${port}/docs`,
    );
  }

  await app.listen(port);
}

bootstrap();
