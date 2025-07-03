import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const PORT = process.env.PORT ?? 3001;
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  // swagger
  const config = new DocumentBuilder()
    .setTitle('Amplify-Integrations Api')
    .setDescription('Amplify Integrations Api')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', in: 'header' }, 'x-api-key')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(PORT);
  console.log(`App is listening on port ${PORT}...`);
}

bootstrap()
  .then()
  .catch((error) => console.error(error));
