import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from 'src/config/config.service';
import '@shopify/shopify-api/adapters/node';
import axios from 'axios';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ShopifyAuthService {
  private readonly logger = new Logger(ShopifyAuthService.name);
  private SHOPIFY_CLIENT_ID: string;
  private SHOPIFY_CLIENT_SECRET: string;

  constructor(
    private config: AppConfigService,
    private jwtService: JwtService,
  ) {
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

  async callbackHandler(params: any) {
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

      return { accessToken, scope, stateBody, shop };
    } catch (error) {
      console.log({ error });
      throw error;
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
}
