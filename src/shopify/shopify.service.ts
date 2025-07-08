import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { GetShopResponseBody } from './types/grapql-admin';
import { Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BusinessDoc, ShopifyAccountDoc, UserDoc } from 'src/database/schema';
import { ShopifyAccountStatus } from './enums';
import { GetProductsDto, GetShopDto, GetShopBrandingDto } from './dto';
import { ShopifyAuthService } from './api/auth';
import { ShopifyGraphqlAdminApi } from './api/graphql-admin';
import { ShopifyStoreFrontApi } from './api/store-front-api';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);

  constructor(
    @InjectModel('shopify-accounts')
    private shopifyAccountModel: Model<ShopifyAccountDoc>,
    @InjectModel('users')
    private usersModel: Model<UserDoc>,
    @InjectModel('business')
    private businessModel: Model<BusinessDoc>,
    private config: AppConfigService,
    private shopifyAuthService: ShopifyAuthService,
    private shopifyGraphqlAdminApi: ShopifyGraphqlAdminApi,
    private shopifyStoreFrontApiService: ShopifyStoreFrontApi,
  ) {}

  getShopifyOAuthUrl(params: { shop: string; userId: string }) {
    const shopifyAuthUrl = this.shopifyAuthService.getShopifyOAuthUrl(params);
    return shopifyAuthUrl;
  }

  async callbackHandler(params: any, res: Response) {
    try {
      const { shop } = params;

      // store the access token in the user's database
      const { accessToken, scope, stateBody } =
        await this.shopifyAuthService.callbackHandler(params);

      const response = await this.shopifyGraphqlAdminApi.getShop({
        shop,
        accessToken,
        scope,
      });

      const shopDetails = response.body.data.shop;

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
          shopId: params.shopDetails.id,
          shop: params.shop,
          belongsTo: userId,
          accessToken: params.accessToken,
          scope: params.scope,
          currencyCode: params.shopDetails.currencyCode,
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

      const brandingRes = await this.shopifyStoreFrontApiService.getShopDetails(
        {
          shop: params.shop,
          accessToken: params.accessToken,
          scope: params.scope,
        },
      );

      const shopBranding = brandingRes.data?.shop?.brand;

      // create business if not exists
      if (!business) {
        business = await this.businessModel.create({
          userId,
          description: params.shopDetails.description ?? undefined,
          companyName: params.shopDetails.name,
          website: params.shopDetails.url,
          shopifyAccounts: [],
          logo: brandingRes.data?.shop?.brand?.logo?.url ?? undefined,
          coverImage: shopBranding?.coverImage?.url ?? undefined,
          currencyCode: params.shopDetails.currencyCode,
          colors: {
            primary: shopBranding?.colors?.primary ?? undefined,
            secondary: shopBranding?.colors?.secondary ?? undefined,
          },
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

  async getProducts(
    params: GetProductsDto,
    query?: { first?: number; after?: string; last?: number; before?: string },
  ) {
    try {
      const response = await this.shopifyGraphqlAdminApi.getProducts(
        params,
        query,
      );

      return response.body.data;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
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
      const response = await this.shopifyGraphqlAdminApi.getProductById(params);

      return response.body.data;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Something Went Wrong');
    }
  }

  async getShop(dto: GetShopDto) {
    const res = await this.shopifyGraphqlAdminApi.getShop(dto);
    return res.body.data;
  }

  async getShopBrandingDetails(dto: GetShopBrandingDto) {
    const res = await this.shopifyStoreFrontApiService.getShopDetails({
      shop: dto.shop,
      accessToken: dto.accessToken,
      scope: dto.scope,
    });

    return res.data;
  }
}
