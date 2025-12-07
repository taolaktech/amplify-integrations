import { Module } from '@nestjs/common';
import { WebhookController } from './shopify-webhook.controller';
import { ShopifyService } from '../shopify/shopify.service';

@Module({
  controllers: [WebhookController],
  providers: [ShopifyService],
})
export class ShopifyWebhookModule {}
