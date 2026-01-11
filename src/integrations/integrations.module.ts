import { Module } from '@nestjs/common';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { ShopifyModule } from 'src/shopify/shopify.module';
import { GoogleAdsModule } from 'src/google-ads/google-ads.module';
import { FacebookAuthModule } from 'src/facebook/facebook-auth/facebook-auth.module';

@Module({
  imports: [ShopifyModule, GoogleAdsModule, FacebookAuthModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
})
export class IntegrationsModule {}
