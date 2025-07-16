import { Module } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { ShopifyController } from './shopify.controller';
import { JwtModule } from '@nestjs/jwt';
import { ShopifyStoreFrontApiService } from './api/store-front/store-front-api.service';
import { ShopifyGraphqlAdminApiService } from './api/graphql-admin/graphql-admin.service';
import { ShopifyAuthService } from './api/auth/auth.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [
    ShopifyService,
    ShopifyAuthService,
    ShopifyStoreFrontApiService,
    ShopifyGraphqlAdminApiService,
  ],
  controllers: [ShopifyController],
})
export class ShopifyModule {}
