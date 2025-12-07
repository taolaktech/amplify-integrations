import { Module } from '@nestjs/common';
import { WebhookController } from './shopify-webhook.controller';
import { ShopifyService } from '../shopify/shopify.service';
import { ShopifyAuthService } from '../shopify/api/auth';
import { ShopifyGraphqlAdminApi } from '../shopify/api/graphql-admin';

@Module({
  controllers: [WebhookController],
  providers: [ShopifyService, ShopifyAuthService, ShopifyGraphqlAdminApi],
})
export class ShopifyWebhookModule {}
