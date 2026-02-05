import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { HealthcheckModule } from './healthcheck/healthcheck.module';
import { DatabaseModule } from './database/database.module';
import { ShopifyModule } from './shopify/shopify.module';
import { ConfigModule } from '@nestjs/config';
import { FacebookModule } from './facebook/facebook.module';
import { GoogleAdsModule } from './google-ads/google-ads.module';
import { ShopifyWebhookModule } from './webhook/shopify-webhook.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from '@nestjs/schedule';
import { VideoGenerationModule } from './video-generation/video-generation.module';

@Module({
  imports: [
    AuthModule,
    AppConfigModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    HealthcheckModule,
    ShopifyModule,
    ShopifyWebhookModule,
    GoogleAdsModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FacebookModule,
    IntegrationsModule,
    VideoGenerationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
