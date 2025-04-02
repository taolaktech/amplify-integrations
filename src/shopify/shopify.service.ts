import { Injectable, UnauthorizedException } from '@nestjs/common';
import { shopifyApi, ApiVersion, Shopify } from '@shopify/shopify-api';
import { AppConfigService } from 'src/config/config.service';
import '@shopify/shopify-api/adapters/node';
import axios from 'axios';
import crypto from 'node:crypto';

@Injectable()
export class ShopifyService {
  private shopify: Shopify;

  constructor(
    private config: AppConfigService,
    // @Inject('SHOPIFY_API') private readonly shopify: Shopify,
  ) {
    this.shopify = shopifyApi({
      apiKey: this.config.get('SHOPIFY_CLIENT_ID'),
      future: {
        lineItemBilling: true,
      },
      apiSecretKey: this.config.get('SHOPIFY_CLIENT_SECRET'),
      scopes: ['read_products', 'read_orders'],
      hostName: 'ngrok-tunnel-address',
      isEmbeddedApp: false,
      apiVersion: ApiVersion.January25,
      isCustomStoreApp: false,
    });
  }

  getOauthUrl() {
    // const client = new shopify.clients.Graphql({ session });
    // const response = await client.query({ data: '{your_query}' });
  }

  handleOauthCallback() {}

  async getProducts(params: {
    shop: string;
    accessToken: string;
    scope: string;
  }) {
    //   curl -X POST \
    // https://{shop}.myshopify.com/admin/api/2025-04/graphql.json \
    // -H 'Content-Type: application/json' \
    // -H 'X-Shopify-Access-Token: {access_token}' \
    // -d '{
    //   "query": "{
    //     products(first: 5) {
    //       edges {
    //         node {
    //           id
    //           handle
    //         }
    //       }
    //       pageInfo {
    //         hasNextPage
    //       }
    //     }
    //   }"
    // }'
    // https://{store_name}.myshopify.com/admin/api/2025-01/graphql.json
    const { shop, accessToken, scope } = params;
    const queryString = `{
      products (first: 3) {
        edges {
          node {
            id
            title
          }
        }
      }
    }`;
    //shop = 'akinola.myshopify.com',
    const client = this.createShopifyClientSession({
      shop,
      accessToken,
      scope,
    });
    const products = await client.query({
      data: queryString,
    });
    const responseExample = {
      data: {
        products: {
          edges: [
            {
              node: {
                title: 'Hiking backpack',
              },
            },
          ],
        },
      },
      extensions: {
        cost: {
          requestedQueryCost: 3,
          actualQueryCost: 3,
          throttleStatus: {
            maximumAvailable: 1000.0,
            currentlyAvailable: 997,
            restoreRate: 50.0,
          },
        },
      },
    };
    console.log({ responseExample });
    console.log({ products });
    return products;
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
    try {
      //POST https://{shop}.myshopify.com/admin/oauth/access_token?client_id={client_id}&client_secret={client_secret}&code={authorization_code}
      const shopifyTokenUrl = `https://${shop}.myshopify.com/admin/oauth/access_token`;
      const response = await axios.post<{
        access_token: string;
        scope: string;
      }>(shopifyTokenUrl, {
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code,
      });
      return response.data;
    } catch (e) {
      console.log({ e });
      throw new UnauthorizedException('Error Granting Permission');
    }
  }

  getShopifyAuthUrl(shop: string) {
    const state = this.generateState(shop);
    const clientId = this.config.get('SHOPIFY_CLIENT_ID');
    const redirectUri = 'http://localhost:3334/api/shopify/auth/callback';
    const scopes = 'read_products,read_orders';
    //https://{shop}.myshopify.com/admin/oauth/authorize?client_id={client_id}&scope={scopes}&redirect_uri={redirect_uri}&state={nonce}&grant_options[]={access_mode}
    const shopifyAuthUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;
    return shopifyAuthUrl;
  }

  async callBackHandler(params: {
    state: string;
    code: string;
    shop: string;
    timestamp: string;
    hmac: string;
  }) {
    /*
    Your app should redirect the user through the authorization code flow if your app has verified the authenticity of the request and any of the following is true:

    Your app doesn't have a token for that shop.
    Your app uses online tokens and the token for that shop has expired.
    Your app has a token for that shop, but it was created before you rotated the app's secret.
    Your app has a token for that shop, but your app now requires scopes that differ from the scopes granted with that token.
    */

    //https:example.org/some/redirect/uri?code={authorization_code}&hmac=da9d83c171400a41f8db91a950508985&host={base64_encoded_hostname}&shop={shop_origin}&state={nonce}&timestamp=1409617544
    const { state, code, timestamp, hmac, shop } = params;
    console.log({ params });
    const isValidShop = this.isValidShop(shop);

    if (!isValidShop) {
      throw new UnauthorizedException('Invalid Shop string');
    }

    // code=0907a61c0c8d55e99db179b68161bc00&shop={shop}.myshopify.com&state=0.6784241404160823&timestamp=1337178173"
    const stitchedHmacString = `code=${code}&shop=${shop}&state=${state}&timestamp=${timestamp}`;

    const isValidHmac = this.verifyHmacForInstallation(
      stitchedHmacString,
      hmac,
    );
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

  private verifyHmacForInstallation(message: string, hmac: string) {
    // const message ='code=0907a61c0c8d55e99db179b68161bc00&shop={shop}.myshopify.com&state=0.6784241404160823&timestamp=1337178173';

    const secret = this.config.get('SHOPIFY_CLIENT_SECRET');

    // Generate HMAC-SHA256 digest
    const digest = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    // Securely compare digests
    function secureCompare(a: string, b: string): boolean {
      return crypto.timingSafeEqual(
        Buffer.from(a, 'hex'),
        Buffer.from(b, 'hex'),
      );
    }

    // Compare hashes
    const isValid = secureCompare(digest, hmac);

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
