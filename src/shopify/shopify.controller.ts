import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
  GetShopBrandingDto,
  GetShopDto,
  CreateWebPixelDto,
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

  @Post('/shop-details')
  async getShopDetails(@Body() dto: GetShopDto) {
    const shopDetails = await this.shopifyService.getShop(dto);
    return shopDetails;
  }

  @Post('/shop-branding')
  async getShopBrandingInfo(@Body() dto: GetShopBrandingDto) {
    return await this.shopifyService.getShopBrandingDetails(dto);
  }

  @ApiQuery({ name: 'first', required: false, type: Number })
  @ApiQuery({ name: 'after', required: false, type: String })
  @ApiQuery({ name: 'last', required: false, type: Number })
  @ApiQuery({ name: 'before', required: false, type: String })
  @Post('/products')
  async getAllProducts(
    @Body() dto: GetProductsDto,
    @Query() query: { [k: string]: string },
  ) {
    const first = query.first ? parseInt(query.first) : undefined;
    const last = query.last ? parseInt(query.last) : undefined;
    if (
      (first !== undefined && isNaN(first)) ||
      (last !== undefined && isNaN(last))
    ) {
      throw new BadRequestException(`first, last must be number or undefined`);
    }
    const { before, after } = query;
    const products = await this.shopifyService.getProducts(dto, {
      first,
      before,
      after,
      last,
    });
    return products;
  }

  @Post('/products/product-by-id')
  async getProductById(@Body() dto: GetProductByIdDto) {
    const products = await this.shopifyService.getProductById(dto);
    return products;
  }

  @Post('/pixels/create-web-pixel')
  async createWebPixel(@Body() dto: CreateWebPixelDto) {
    const pixel = await this.shopifyService.createWebPixel(dto);
    return pixel;
  }
}
