import { Injectable, UnauthorizedException } from '@nestjs/common';
import {
  shopifyApi,
  ApiVersion,
  Shopify,
  LogSeverity,
} from '@shopify/shopify-api';
import { AppConfigService } from '../config/config.service';
import '@shopify/shopify-api/adapters/node';
import axios from 'axios';
import * as crypto from 'crypto';

@Injectable()
export class ShopifyService {
  private shopify: Shopify;
  private SHOPIFY_CLIENT_ID: string;
  private SHOPIFY_CLIENT_SECRET: string;

  constructor(
    private config: AppConfigService,
    // @Inject('SHOPIFY_API') private readonly shopify: Shopify,
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

  handleOauthCallback() {}

  async getProducts(params: {
    shop: string;
    accessToken: string;
    scope: string;
  }) {
    const { shop, accessToken, scope } = params;
    //shop = 'akinola.myshopify.com',
    const client = this.createShopifyClientSession({
      shop,
      accessToken,
      scope,
    });
    const response = await client.query({
      data: {
        query: `#graphql
          query GetProducts($first: Int!) {
            shop {
              currencyCode
            }
            products (first: $first) {
              edges {
                node {
                  id
                  title
                  description
                  variants(first: 10) {
                    edges {
                      node {
                        id,
                        displayName,
                        title,
                        price,
                        image {
                          id,
                          url,
                        }
                      }
                    }
                    pageInfo {
                      hasNextPage
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
              }
            }
          }`,
        variables: {
          first: 3,
        },
      },
    });

    // console.log(JSON.stringify(responseExample));
    // console.log(JSON.stringify(response));
    // console.log(response.body);
    return response;
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
      //POST https://{shop}.myshopify.com/admin/oauth/access_token?client_id={client_id}&client_secret={client_secret}&code={authorization_code}
      const shopifyTokenUrl = `https://${shopString}.myshopify.com/admin/oauth/access_token?client_id=${this.SHOPIFY_CLIENT_ID}&client_secret=${this.SHOPIFY_CLIENT_SECRET}&code=${code}`;
      const response = await axios.post<{
        access_token: string;
        scope: string;
      }>(shopifyTokenUrl);
      return response.data;
    } catch (e) {
      console.log({ e });
      throw new UnauthorizedException('Error Granting Permission');
    }
  }

  getShopifyOAuthUrl(shop: string) {
    const state = this.generateState(shop);
    const clientId = this.config.get('SHOPIFY_CLIENT_ID');
    const redirectUri = 'http://localhost:3334/api/shopify/auth/callback';
    const scopes = 'read_products,read_orders';
    //https://{shop}.myshopify.com/admin/oauth/authorize?client_id={client_id}&scope={scopes}&redirect_uri={redirect_uri}&state={nonce}&grant_options[]={access_mode}
    const shopifyAuthUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;
    return shopifyAuthUrl;
  }

  async callbackHandler(params: any) {
    /*
    Your app should redirect the user through the authorization code flow if your app has verified the authenticity of the request and any of the following is true:

    Your app doesn't have a token for that shop.
    Your app uses online tokens and the token for that shop has expired.
    Your app has a token for that shop, but it was created before you rotated the app's secret.
    Your app has a token for that shop, but your app now requires scopes that differ from the scopes granted with that token.
    */
    // {
    //   state: string;
    //   code: string;
    //   host: string;
    //   shop: string;
    //   timestamp: string;
    //   hmac: string;
    // }
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
    const isValidState = this.verifyState(state);
    if (!isValidState) {
      throw new UnauthorizedException('Invalid State');
    }

    // store the access token in the user's database
    const { access_token: accessToken, scope } = await this.getAccessToken(
      shop,
      code,
    );
    // save scope and access token in user's database

    console.log({ accessToken, scope });

    // redirect to app

    return true;
  }

  public verifyHmac(params: any) {
    const { hmac, ...rest } = params;

    if (!hmac) {
      return false;
    }

    // const stitchedHmacString = `code=${code}&host=${host}&shop=${shop}&state=${state}&timestamp=${timestamp}`;

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

  private generateState(shop: string) {
    return `asignedjwtstring-${shop}`;
  }

  private verifyState(state: string) {
    // decode jwt
    return !!state;
  }

  private isValidShop(shop: string) {
    // eslint-disable-next-line no-useless-escape
    const regex = /^https?\:\/\/[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com\/?/;

    // eslint-disable-next-line no-useless-escape
    const regex2 = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com/;

    const isValid = regex.test(shop) || regex2.test(shop);
    return isValid;
  }
}
