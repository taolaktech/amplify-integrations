import { Module } from '@nestjs/common';
import { WebhookController } from './shopify-webhook.controller';
import { ShopifyService } from '../shopify/shopify.service';
import { ShopifyAuthService } from '../shopify/api/auth';
import { ShopifyGraphqlAdminApi } from '../shopify/api/graphql-admin';
import { ShopifyStoreFrontApi } from '../shopify/api/store-front-api';

@Module({
  controllers: [WebhookController],
  providers: [
      ShopifyService,
      ShopifyAuthService,
      ShopifyStoreFrontApi,
      ShopifyGraphqlAdminApi,
    ],
})
export class ShopifyWebhookModule {}
