import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { Public } from 'src/auth/decorators';
import {
  GetProductByIdDto,
  GetProductsDto,
  GetShopifyOAuthUrlDto,
} from './dto';
import { ApiSecurity } from '@nestjs/swagger';

@ApiSecurity('x-api-key')
@Controller('api/shopify')
export class ShopifyController {
  constructor(private shopifyService: ShopifyService) {}

  @Public()
  @Get('/auth/callback')
  async shopifyOauthCallback(@Query() query: any) {
    return await this.shopifyService.callbackHandler(query);
  }

  @Post('/auth/url')
  shopifyOauthUrl(@Body() dto: GetShopifyOAuthUrlDto) {
    const url = this.shopifyService.getShopifyOAuthUrl(dto);
    return { url };
  }

  @Post('/products')
  async getAllProducts(@Body() dto: GetProductsDto) {
    const products = await this.shopifyService.getProducts(dto);
    return products;
  }
  @Post('/products/:productId')
  async getProductById(
    @Body() dto: GetProductByIdDto,
    @Param('productId') productId: string,
  ) {
    const products = await this.shopifyService.getProductById({
      ...dto,
      productId,
    });
    return products;
  }
}
