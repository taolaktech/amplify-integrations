import { Controller, Get, Param, Query } from '@nestjs/common';
import { ShopifyService } from './shopify.service';

@Controller('api/shopify')
export class ShopifyController {
  constructor(private shopifyService: ShopifyService) {}

  @Get('/auth/url/:shop')
  shopifyOauthUrl(@Param('shop') shop: string) {
    const url = this.shopifyService.getShopifyOAuthUrl(shop);
    return { url };
  }

  @Get('/auth/callback')
  async shopifyOauthCallback(@Query() query: any) {
    // Implement the logic for redirecting the user to the Shopify OAuth page
    console.log({ query });
    return await this.shopifyService.callbackHandler({
      state: query.state,
      host: query.host,
      code: query.code,
      shop: query.shop,
      hmac: query.hmac,
      timestamp: query.timestamp,
    });
  }
}
