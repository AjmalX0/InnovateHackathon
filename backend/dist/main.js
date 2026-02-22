"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new transform_interceptor_1.TransformInterceptor());
    app.enableCors({ origin: '*' });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('VidyaBot API')
        .setDescription('Offline-first, voice-first agentic AI tutor for Kerala students')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('students', 'Student profile & grade management')
        .addTag('chat', 'Text & voice chat input')
        .addTag('upload', 'Document upload (PDF / image)')
        .addTag('transcription', 'Whisper voice-to-text pipeline')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`\n🚀 VidyaBot backend running on: http://localhost:${port}`);
    console.log(`📚 Swagger docs:              http://localhost:${port}/api/docs\n`);
}
bootstrap();
//# sourceMappingURL=main.js.map