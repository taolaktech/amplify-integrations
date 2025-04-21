import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  shopifyApi,
  ApiVersion,
  Shopify,
  LogSeverity,
  GraphqlQueryError,
} from '@shopify/shopify-api';
import { AppConfigService } from '../config/config.service';
import '@shopify/shopify-api/adapters/node';
import axios from 'axios';
import * as crypto from 'crypto';
import {
  GetAllProductsResponseBody,
  GetProductByIdResponseBody,
} from './types';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShopifyAccountDoc } from 'src/database/schema';
import { ShopifyAccountStatus } from 'src/enums/shopify-account-status';
import { getProductsByIdQuery, getProductsQuery } from './shopify.queries';

@Injectable()
export class ShopifyService {
  private shopify: Shopify;
  private SHOPIFY_CLIENT_ID: string;
  private SHOPIFY_CLIENT_SECRET: string;

  constructor(
    private config: AppConfigService,
    private jwtService: JwtService,
    @InjectModel('shopify-accounts')
    private shopifyAccountModel: Model<ShopifyAccountDoc>,
  ) {
    this.shopify = shopifyApi({
      apiKey: this.config.get('SHOPIFY_CLIENT_ID'),
      apiSecretKey: this.config.get('SHOPIFY_CLIENT_SECRET'),
      scopes: ['read_products', 'read_orders'],
      hostName: 'ngrok-tunnel-address',
      isEmbeddedApp: false,
      apiVersion: ApiVersion.January25,
      isCustomStoreApp: false,
      logger: { level: LogSeverity.Error },
    });
    this.SHOPIFY_CLIENT_ID = this.config.get('SHOPIFY_CLIENT_ID');
    this.SHOPIFY_CLIENT_SECRET = this.config.get('SHOPIFY_CLIENT_SECRET');
  }

  getShopifyOAuthUrl(params: { shop: string; userId: string }) {
    const { userId } = params;
    const shop = this.parseShopStrToLongName(params.shop);
    const state = this.generateState(userId);
    const clientId = this.config.get('SHOPIFY_CLIENT_ID');
    const API_URL = this.config.get('API_URL');
    const redirectUri = `${API_URL}/api/shopify/auth/callback`;
    const scopes = 'read_products,read_orders';
    const shopifyAuthUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;
    return shopifyAuthUrl;
  }

  async callbackHandler(params: any, res: Response) {
    try {
      const { state, code, shop } = params;

      const isValidShop = this.isValidShop(shop);

      if (!isValidShop) {
        throw new UnauthorizedException('Invalid Shop string');
      }

      const isValidHmac = this.verifyHmac(params);
      if (!isValidHmac) {
        throw new UnauthorizedException('Invalid Hmac');
      }

      // verify state was created by me
      const stateBody = this.verifyState(state);
      if (!stateBody) {
        throw new UnauthorizedException('Invalid State');
      }

      // store the access token in the user's database
      const { access_token: accessToken, scope } = await this.getAccessToken(
        shop,
        code,
      );

      // send request to manager to save these values
      await this.sendSaveRequestToManager({
        accessToken,
        userId: stateBody.userId,
        shop,
        scope,
      });
      return res.redirect(
        `${this.config.get('CLIENT_URL')}/shopify/auth/success`,
      );
    } catch (error) {
      console.log({ error });
      return res.redirect(
        `${this.config.get('CLIENT_URL')}/shopify/auth/failed`,
      );
    }
  }

  private async sendSaveRequestToManager(params: {
    accessToken: string;
    userId: string;
    shop: string;
    scope: string;
  }) {
    // send request to manager to save account values
    try {
      await this.shopifyAccountModel.create({
        shop: params.shop,
        accessToken: params.accessToken,
        scope: params.scope,
        belongsTo: params.userId,
        accountStatus: ShopifyAccountStatus.CONNECTED,
      });
    } catch {
      throw new InternalServerErrorException('Error saving account values');
    }
  }

  private verifyHmac(params: any) {
    const { hmac, ...rest } = params;

    if (!hmac) {
      return false;
    }

    const keys = Object.keys(rest);
    keys.sort();

    let stitchedHmacString = '';
    for (const k of keys) {
      stitchedHmacString = stitchedHmacString + `&${k}=${rest[k]}`;
    }
    // remove first &
    stitchedHmacString = stitchedHmacString.slice(1);

    const secret = this.SHOPIFY_CLIENT_SECRET;

    const digest = crypto
      .createHmac('sha256', secret)
      .update(stitchedHmacString)
      .digest('hex');

    // Compare hashes
    const isValid = crypto.timingSafeEqual(
      Buffer.from(digest, 'hex'),
      Buffer.from(hmac, 'hex'),
    );

    return isValid;
  }

  private generateState(userId: string) {
    // sign jwt with the customerId
    const token = this.jwtService.sign(
      { userId },
      {
        secret: this.config.get('JWT_SECRET'),
      },
    );
    return token;
  }

  private verifyState(state: string) {
    try {
      const decoded = this.jwtService.verify<{ userId: string }>(state, {
        secret: this.config.get('JWT_SECRET'),
      });

      return decoded;
    } catch {
      return null;
    }
  }

  private isValidShop(shop: string) {
    // eslint-disable-next-line no-useless-escape
    const regex = /^https?\:\/\/[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com\/?/;

    // eslint-disable-next-line no-useless-escape
    const regex2 = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com/;

    const isValid = regex.test(shop) || regex2.test(shop);
    return isValid;
  }

  private createShopifyClientSession(params: {
    shop: string;
    accessToken: string;
    scope: string;
  }) {
    const session = this.shopify.session.customAppSession(params.shop);
    session.accessToken = params.accessToken;
    session.scope = params.scope;

    const client = new this.shopify.clients.Graphql({ session });
    return client;
  }

  private async getAccessToken(shop: string, code: string) {
    const shopString = shop.split('.')[0];
    try {
      const shopifyTokenUrl = `https://${shopString}.myshopify.com/admin/oauth/access_token?client_id=${this.SHOPIFY_CLIENT_ID}&client_secret=${this.SHOPIFY_CLIENT_SECRET}&code=${code}`;
      const response = await axios.post<{
        access_token: string;
        scope: string;
      }>(shopifyTokenUrl);
      return response.data;
    } catch {
      throw new UnauthorizedException('Error Granting Permission');
    }
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

  async getProducts(
    params: {
      shop: string;
      accessToken: string;
      scope: string;
    },
    query?: { first?: number; after?: string },
  ) {
    try {
      const { shop, accessToken, scope } = params;
      let first = 10;
      let after = '';
      if (query) {
        first = query.first ? Math.max(Number(query.first), 20) : first;
        after = query.after ?? after;
      }
      const variables = { first };

      let paramsDefinition = '$first: Int!';
      let qParams = 'first: $first';

      if (after) {
        variables['after'] = after;
        paramsDefinition = `${paramsDefinition}, $after: String`;
        qParams = `${qParams}, after: $after`;
      }
      const client = this.createShopifyClientSession({
        shop: this.parseShopStrToLongName(shop),
        accessToken,
        scope,
      });
      const response = await client.query<GetAllProductsResponseBody>({
        data: {
          query: getProductsQuery(paramsDefinition, qParams),
          variables,
        },
      });

      return response.body.data;
    } catch (error: unknown) {
      if (error instanceof GraphqlQueryError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Something Went Wrong');
    }
  }

  async getProductById(params: {
    shop: string;
    productId: string;
    accessToken: string;
    scope: string;
  }) {
    try {
      const { shop, accessToken, scope, productId } = params;
      const client = this.createShopifyClientSession({
        shop: this.parseShopStrToLongName(shop),
        accessToken,
        scope,
      });
      const response = await client.query<GetProductByIdResponseBody>({
        data: {
          query: getProductsByIdQuery(),
          variables: {
            identifier: {
              id: productId,
            },
          },
        },
      });

      return response.body.data;
    } catch (error: unknown) {
      if (error instanceof GraphqlQueryError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Something Went Wrong');
    }
  }
}
