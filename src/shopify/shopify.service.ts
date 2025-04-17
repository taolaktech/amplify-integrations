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
import {
  GetAllProductsResponseBody,
  GetProductByIdResponseBody,
} from './types';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ShopifyService {
  private shopify: Shopify;
  private SHOPIFY_CLIENT_ID: string;
  private SHOPIFY_CLIENT_SECRET: string;

  constructor(
    private config: AppConfigService,
    private jwtService: JwtService,
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
    const { shop, userId } = params;
    const state = this.generateState(userId);
    const clientId = this.config.get('SHOPIFY_CLIENT_ID');
    const API_URL = this.config.get('API_URL');
    const redirectUri = `${API_URL}/api/shopify/auth/callback`;
    const scopes = 'read_products,read_orders';
    //https://{shop}.myshopify.com/admin/oauth/authorize?client_id={client_id}&scope={scopes}&redirect_uri={redirect_uri}&state={nonce}&grant_options[]={access_mode}
    const shopifyAuthUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;
    return shopifyAuthUrl;
  }

  async callbackHandler(params: any) {
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

    console.log({ accessToken, scope, userId: stateBody.userId });

    // send request to manager to save these values ??

    // redirect client

    return true;
  }

  public verifyHmac(params: any) {
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
    const response = await client.query<GetAllProductsResponseBody>({
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
                  priceRangeV2 {
                    maxVariantPrice {
                      amount
                      currencyCode
                    }
                    minVariantPrice {
                      amount
                      currencyCode
                    }
                  }
                  media(first: 2) {
                    edges {
                      node {
                        id
                        mediaContentType
                        preview {
                          image {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                  variants(first: 10) {
                    edges {
                      node {
                        id,
                        displayName,
                        title,
                        price,
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

    return response.body;
  }

  async getProductById(params: {
    shop: string;
    productId: string;
    accessToken: string;
    scope: string;
  }) {
    const { shop, accessToken, scope, productId } = params;
    //shop = 'akinola.myshopify.com',
    const client = this.createShopifyClientSession({
      shop,
      accessToken,
      scope,
    });
    const response = await client.query<GetProductByIdResponseBody>({
      data: {
        query: `#graphql
          query getProductById($identifier: ProductIdentifierInput!) {
            shop {
              currencyCode
            }
            productByIdentifier (identifier: $identifier) {
              id
              title
              description
              priceRangeV2 {
                maxVariantPrice {
                  amount
                  currencyCode
                }
                minVariantPrice {
                  amount
                  currencyCode
                }
              }
              media(first: 2) {
                edges {
                  node {
                    id
                    mediaContentType
                    preview {
                      image {
                        url
                        altText
                      }
                    }
                  }
                }
              }
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
          }`,
        variables: {
          identifier: {
            id: productId,
          },
        },
      },
    });

    return response.body;
  }
}
