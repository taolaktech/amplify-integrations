import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { GraphqlQueryError } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';
import { createStorefrontApiClient } from '@shopify/storefront-api-client';
import { fetch as nodeFetch } from 'node-fetch';
import { getShopQuery } from './store-front.queries';
import { ShopResponseData } from '../../types/storefront';

@Injectable()
export class ShopifyStoreFrontApiService {
  private readonly logger = new Logger(ShopifyStoreFrontApiService.name);
  private readonly STORE_FRONT_API_VERION = '2025-07';

  constructor() {}

  private createStorefrontClientSession(params: {
    shop: string;
    accessToken: string;
    scope: string;
  }) {
    const shop = this.parseShopStrToLongName(params.shop);
    return createStorefrontApiClient({
      storeDomain: `http://${shop}`,
      apiVersion: this.STORE_FRONT_API_VERION,
      privateAccessToken: params.accessToken,
      customFetchApi: nodeFetch,
    });
  }

  private parseShopStrToLongName(shop: string): string {
    // eslint-disable-next-line no-useless-escape
    const regex = /^https?\:\/\/[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com\/?/;
    // eslint-disable-next-line no-useless-escape
    const regex2 = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com/;

    if (regex.test(shop)) {
      return this.parseShopStrToLongName(shop.split('//')[1]);
    }

    if (regex2.test(shop)) {
      return shop;
    }

    const shopName = shop.split('.')[0];

    return `${shopName}.myshopify.com`;
  }

  private async getShop(params: {
    shop: string;
    accessToken: string;
    scope: string;
  }) {
    try {
      const { shop, accessToken, scope } = params;
      const client = this.createStorefrontClientSession({
        shop: this.parseShopStrToLongName(shop),
        accessToken,
        scope,
      });

      const response = await client.request<ShopResponseData>(getShopQuery(), {
        variables: {
          handle: 'sample-product',
        },
      });

      return response;
    } catch (error: unknown) {
      if (error instanceof GraphqlQueryError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async getShopDetails(dto: {
    shop: string;
    accessToken: string;
    scope: string;
  }) {
    return await this.getShop({
      shop: dto.shop,
      accessToken: dto.accessToken,
      scope: dto.scope,
    });
  }
}
