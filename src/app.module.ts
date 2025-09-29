import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { HealthcheckModule } from './healthcheck/healthcheck.module';
import { DatabaseModule } from './database/database.module';
import { ShopifyModule } from './shopify/shopify.module';
import { ConfigModule } from '@nestjs/config';
import { FacebookModule } from './facebook/facebook.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthcheckModule,
    ShopifyModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FacebookModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
