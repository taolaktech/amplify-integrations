import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { HealthcheckModule } from './healthcheck/healthcheck.module';
import { DatabaseModule } from './database/database.module';
import { ShopifyModule } from './shopify/shopify.module';
import { ConfigModule } from '@nestjs/config';
import { CampaignModule } from './campaign/campaign.module';
import { FacebookModule } from './facebook/facebook.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';
import { BusinessModule } from './business/business.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthcheckModule,
    ShopifyModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CampaignModule,
    FacebookModule,
    BusinessModule,
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
