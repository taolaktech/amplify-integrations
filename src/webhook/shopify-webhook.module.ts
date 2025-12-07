import { Module } from '@nestjs/common';
import { WebhookController } from './shopify-webhook.controller';
import { ShopifyService } from '../shopify/shopify.service';
import { ShopifyAuthService } from '../shopify/api/auth';

@Module({
  controllers: [WebhookController],
  providers: [ShopifyService, ShopifyAuthService],
})
export class ShopifyWebhookModule {}
