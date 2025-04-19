import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { Public } from 'src/auth/decorators';
import {
  GetProductByIdDto,
  GetProductsDto,
  GetShopifyOAuthUrlDto,
} from './dto';
import { ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { Response } from 'express';

@ApiSecurity('x-api-key')
@Controller('api/shopify')
export class ShopifyController {
  constructor(private shopifyService: ShopifyService) {}

  @Public()
  @Get('/auth/callback')
  async shopifyOauthCallback(@Query() query: any, @Res() response: Response) {
    return await this.shopifyService.callbackHandler(query, response);
  }

  @Post('/auth/url')
  shopifyOauthUrl(@Body() dto: GetShopifyOAuthUrlDto) {
    const url = this.shopifyService.getShopifyOAuthUrl(dto);
    return { url };
  }

  @ApiQuery({ name: 'first', required: false, type: Number })
  @ApiQuery({ name: 'after', required: false, type: String })
  @Post('/products')
  async getAllProducts(
    @Body() dto: GetProductsDto,
    @Query('first', new DefaultValuePipe(10), ParseIntPipe) first: number,
    @Query('after') after?: string,
  ) {
    const products = await this.shopifyService.getProducts(dto, {
      first,
      after,
    });
    return products;
  }

  @Post('/products/product-by-id')
  async getProductById(@Body() dto: GetProductByIdDto) {
    const products = await this.shopifyService.getProductById({
      ...dto,
    });
    return products;
  }
}
