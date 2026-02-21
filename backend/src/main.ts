import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ── Global Validation ──────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,        // auto-cast types from DTO
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global Exception Filter ────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Global Response Transform ──────────────────────────────
  app.useGlobalInterceptors(new TransformInterceptor());

  // ── CORS (Flutter app will call from emulator/device) ──────
  app.enableCors({ origin: '*' });

  // ── Swagger API Docs ───────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('VidyaBot API')
    .setDescription(
      'Offline-first, voice-first agentic AI tutor for Kerala students',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('students', 'Student profile & grade management')
    .addTag('chat', 'Text & voice chat input')
    .addTag('upload', 'Document upload (PDF / image)')
    .addTag('transcription', 'Whisper voice-to-text pipeline')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`\n🚀 VidyaBot backend running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs:              http://localhost:${port}/api/docs\n`);
}

bootstrap();
