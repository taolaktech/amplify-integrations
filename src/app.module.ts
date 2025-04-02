import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { HealthcheckModule } from './healthcheck/healthcheck.module';
import { ShopifyModule } from './shopify/shopify.module';

@Module({
  imports: [AppConfigModule, HealthcheckModule, ShopifyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
