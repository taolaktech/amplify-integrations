import { Module } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { ShopifyController } from './shopify.controller';
import { JwtModule } from '@nestjs/jwt';
import { ShopifyStoreFrontApi } from './api/store-front-api';
import { ShopifyGraphqlAdminApi } from './api/graphql-admin';
import { ShopifyAuthService } from './api/auth';

@Module({
  imports: [JwtModule.register({})],
  providers: [
    ShopifyService,
    ShopifyAuthService,
    ShopifyStoreFrontApi,
    ShopifyGraphqlAdminApi,
  ],
  controllers: [ShopifyController],
})
export class ShopifyModule {}
