import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
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
  GetShopResponseBody,
} from './types';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BusinessDoc, ShopifyAccountDoc, UserDoc } from 'src/database/schema';
import { ShopifyAccountStatus } from '../enums';
import {
  getProductsByIdQuery,
  getProductsQuery,
  getShopQuery,
} from './shopify.queries';
import { GetShopifyShopDetailsDto } from './dto';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  private shopify: Shopify;
  private SHOPIFY_CLIENT_ID: string;
  private SHOPIFY_CLIENT_SECRET: string;

  constructor(
    @InjectModel('shopify-accounts')
    private shopifyAccountModel: Model<ShopifyAccountDoc>,
    @InjectModel('users')
    private usersModel: Model<UserDoc>,
    private config: AppConfigService,
    private jwtService: JwtService,
    @InjectModel('businesses')
    private businessModel: Model<BusinessDoc>,
  ) {
    this.shopify = shopifyApi({
      apiKey: this.config.get('SHOPIFY_CLIENT_ID'),
      apiSecretKey: this.config.get('SHOPIFY_CLIENT_SECRET'),
      scopes: [
        'read_products',
        'read_orders',
        'unauthenticated_read_product_listings',
      ],
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
    const scopes =
      'read_products,read_orders,unauthenticated_read_product_listings';
    const shopifyAuthUrl = `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;
    return shopifyAuthUrl;
  }

  async callbackHandler(params: any, res: Response) {
    try {
      const { state, code, shop } = params;

      const isValidShop = this.isValidShop(shop);

      if (!isValidShop) {
        throw new UnauthorizedException('E_INVALID_SHOP');
      }

      const isValidHmac = this.verifyHmac(params);
      if (!isValidHmac) {
        throw new UnauthorizedException('E_INVALID_REQUEST');
      }

      // verify state was created by me
      const stateBody = this.verifyState(state);
      if (!stateBody) {
        throw new UnauthorizedException('E_INVALID_REQUEST');
      }

      // store the access token in the user's database
      const { access_token: accessToken, scope } = await this.getAccessToken(
        shop,
        code,
      );

      const { shop: shopDetails } = await this.getShop({
        shop,
        accessToken,
        scope,
      });

      // if (
      //   shopDetails.currencyCode !== 'USD' &&
      //   shopDetails.currencyCode !== 'CAD'
      // ) {
      //   throw new BadRequestException('E_CURRENCY_NOT_SUPPORTED');
      // }

      // send request to manager to save these values
      await this.saveAccountInfo({
        accessToken,
        userId: stateBody.userId,
        shop,
        shopDetails,
        scope,
      });

      return res.redirect(
        `${this.config.get('CLIENT_URL')}/setup?linked_store=true`,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        return res.redirect(
          `${this.config.get('CLIENT_URL')}/shopify/auth/failed?error=${error.message}`,
        );
      }
      console.log({ error });
      return res.redirect(
        `${this.config.get('CLIENT_URL')}/shopify/auth/failed?error=E_INTERNAL_SERVER_ERROR`,
      );
    }
  }

  private async saveAccountInfo(params: {
    accessToken: string;
    userId: string;
    shop: string;
    shopDetails: GetShopResponseBody['data']['shop'];
    scope: string;
  }) {
    // send request to manager to save account values
    try {
      const userId = new Types.ObjectId(params.userId);
      const shopifyAccount = await this.shopifyAccountModel.findOneAndUpdate(
        {
          shop: params.shop,
          belongsTo: userId,
        },
        {
          shop: params.shop,
          belongsTo: userId,
          accessToken: params.accessToken,
          scope: params.scope,
          accountStatus: ShopifyAccountStatus.CONNECTED,
        },
        { upsert: true, new: true },
      );

      const user = await this.usersModel.findById(params.userId);
      if (user) {
        user.onboarding = { ...user.onboarding, shopifyAccountConnected: true };
        await user.save();
      }

      // get business
      let business = await this.businessModel.findOne({
        userId,
      });

      // create business if not exists
      if (!business) {
        business = await this.businessModel.create({
          userId,
          shopifyAccounts: [],
        });
      }

      const shopifyAccountStrings = business.shopifyAccounts.map((id) =>
        id.toString(),
      );
      const uniqueShopifyAccountStrings = new Set([
        ...shopifyAccountStrings,
        shopifyAccount._id.toString(),
      ]);

      business.shopifyAccounts = [...uniqueShopifyAccountStrings].map(
        (id) => new Types.ObjectId(id),
      );
      await business.save();
    } catch (c: any) {
      console.log(c);
      throw new InternalServerErrorException('Error Updating Account');
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
    query?: { first?: number; after?: string; last?: number; before?: string },
  ) {
    try {
      if (query?.first && query?.last) {
        throw new BadRequestException('Cannot use first and last together');
      }

      const { shop, accessToken, scope } = params;

      let first = 10;
      let paramsDefinition = '';
      let qParams = '';

      if (!query?.first && !query?.last) {
        first = 10;
        paramsDefinition = '$first: Int!';
        qParams = 'first: $first';
      }

      const variables: {
        first?: number;
        after?: string;
        last?: number;
        before?: string;
      } = { first };

      if (query?.first) {
        first = query.first;
        variables['first'] = query.first;
        paramsDefinition = '$first: Int!';
        qParams = 'first: $first';
      }

      if (query?.after) {
        variables['after'] = query.after;
        paramsDefinition = `${paramsDefinition}, $after: String`;
        qParams = `${qParams}, after: $after`;
      }

      if (query?.last) {
        variables['last'] = query.last;
        variables['first'] = undefined;
        paramsDefinition = `$last: Int`;
        qParams = `last: $last`;
      }

      if (query?.before) {
        variables['before'] = query.before;
        paramsDefinition = `${paramsDefinition}, $before: String`;
        qParams = `${qParams}, before: $before`;
      }

      const client = this.createShopifyClientSession({
        shop: this.parseShopStrToLongName(shop),
        accessToken,
        scope,
      });

      const q = getProductsQuery(paramsDefinition, qParams);

      const response = await client.query<GetAllProductsResponseBody>({
        data: {
          query: q,
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
    accessToken: string;
    scope: string;
    productId?: string;
    handle?: string;
  }) {
    try {
      const { shop, accessToken, scope, productId, handle } = params;
      if (!productId && !handle) {
        throw new BadRequestException('ProductId or Handle is required');
      }
      const identifier = productId ? { id: productId } : { handle };
      const client = this.createShopifyClientSession({
        shop: this.parseShopStrToLongName(shop),
        accessToken,
        scope,
      });
      const response = await client.query<GetProductByIdResponseBody>({
        data: {
          query: getProductsByIdQuery(),
          variables: {
            identifier,
          },
        },
      });

      return response.body.data;
    } catch (error: unknown) {
      if (error instanceof GraphqlQueryError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async getShop(params: {
    shop: string;
    accessToken: string;
    scope: string;
  }) {
    try {
      const { shop, accessToken, scope } = params;
      const client = this.createShopifyClientSession({
        shop: this.parseShopStrToLongName(shop),
        accessToken,
        scope,
      });
      const response = await client.query<GetShopResponseBody>({
        data: {
          query: getShopQuery(),
        },
      });

      return response.body.data;
    } catch (error: unknown) {
      if (error instanceof GraphqlQueryError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async getShopDetails(dto: GetShopifyShopDetailsDto) {
    return await this.getShop({
      shop: dto.shop,
      accessToken: dto.accessToken,
      scope: dto.scope,
    });
  }
}
