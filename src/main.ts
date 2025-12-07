import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const PORT = process.env.PORT ?? 3001;
  const app = await NestFactory.create(AppModule);

  app.use(
    bodyParser.json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf; // Required for HMAC verification
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      whitelist: true,
      // Throw error if unknown properties are present
      forbidNonWhitelisted: true,

      // Transform payload to DTO instance
      transform: true,
    }),
  );

  // cors
  app.enableCors({
    origin: '*', // allowing requests from all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // swagger
  const config = new DocumentBuilder()
    .setTitle('Amplify-Integrations Api')
    .setDescription('Amplify Integrations Api')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', in: 'header' }, 'x-api-key')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  const dir = './public';

  // Ensure the directory exists
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write the Swagger JSON to the public directory
  writeFileSync('./public/swagger.json', JSON.stringify(documentFactory()));
  // SwaggerModule.setup('docs', app, documentFactory, redocOptions);

  app.use('/api-json', (req, res) => {
    res.header('Content-Type', 'application/json');
    res.send(JSON.stringify(documentFactory(), null, 2));
  });

  // Create a custom Scalar endpoint at /docs
  app.use('/docs', (req, res) => {
    const scalarHtml = `
       <!DOCTYPE html>
       <html>
         <head>
           <title>Amplify Integrations API Documentation</title>
           <meta charset="utf-8" />
           <meta name="viewport" content="width=device-width, initial-scale=1" />
         </head>
         <body>
           <script
             id="api-reference"
             data-url="/api-json"
             data-configuration='{
               "theme": "purple",
               "layout": "modern",
               "defaultHttpClient": {
                 "targetKey": "javascript",
                 "clientKey": "fetch"
               },
               "showSidebar": true,
               "customCss": "--scalar-color-1: #121212; --scalar-color-2: #2a2a2a; --scalar-color-3: #8b5cf6;",
               "searchHotKey": "k",
               "navigation": {
                 "title": "Amplify Integrations API"
               }
             }'></script>
           <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
         </body>
       </html>
     `;
    res.send(scalarHtml);
  });

  await app.listen(PORT);
  console.log(`App is listening on port ${PORT}...`);
}

bootstrap()
  .then()
  .catch((error) => console.error(error));
