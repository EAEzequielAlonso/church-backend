process.env.TZ = 'UTC';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe, BadRequestException, Logger } from '@nestjs/common';
import { runtimeFlags } from './common/runtime-flags';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Simple Request Logger
  app.use((req: any, res: any, next: any) => {
    logger.log(`[REQ] ${req.method} ${req.url}`);
    next();
  });

  // Enable Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        logger.debug(`Validation errors: ${JSON.stringify(errors)}`);
        return new BadRequestException(errors);
      },
    }),
  );

  if (runtimeFlags.swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Telyon API')
      .setDescription('The Telyon church management API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    logger.log('Swagger configured on /api');
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on port ${port}`);
}
bootstrap();
