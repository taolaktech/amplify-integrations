import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  shopifyApi,
  ApiVersion,
  Shopify,
  LogSeverity,
  GraphqlQueryError,
} from '@shopify/shopify-api';
import { AppConfigService } from 'src/config/config.service';
import '@shopify/shopify-api/adapters/node';
import {
  GetAllProductsResponseBody,
  GetProductByIdResponseBody,
  GetShopResponseBody,
} from '../../types/grapql-admin';
import {
  getOrdersCountQuery,
  getOrdersQuery,
  getProductsByIdQuery,
  getProductsQuery,
  getShopQuery,
} from './graphql-admin.queries';

@Injectable()
export class ShopifyGraphqlAdminApiService {
  private readonly logger = new Logger(ShopifyGraphqlAdminApiService.name);
  private shopify: Shopify;

  constructor(private config: AppConfigService) {
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
      apiVersion: ApiVersion.July25,
      isCustomStoreApp: false,
      logger: { level: LogSeverity.Error },
    });
  }

  private createShopifyClientSession(params: {
    shop: string;
    accessToken: string;
    scope: string;
  }) {
    const shop = this.parseShopStrToLongName(params.shop);
    const session = this.shopify.session.customAppSession(shop);
    session.accessToken = params.accessToken;
    session.scope = params.scope;

    const client = new this.shopify.clients.Graphql({ session });
    return client;
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
        shop,
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

      return response;
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
        shop,
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

      return response;
    } catch (error: unknown) {
      if (error instanceof GraphqlQueryError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async getShop(params: { shop: string; accessToken: string; scope: string }) {
    try {
      const { shop, accessToken, scope } = params;
      const client = this.createShopifyClientSession({
        shop,
        accessToken,
        scope,
      });

      const response = await client.query<GetShopResponseBody>({
        data: {
          query: getShopQuery(),
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

  async getOrders(
    params: {
      shop: string;
      accessToken: string;
      scope: string;
    },
    query?: {
      first?: number;
      after?: string;
      last?: number;
      before?: string;
      query?: string;
    },
  ) {
    try {
      if (query?.first && query?.last) {
        throw new BadRequestException('Cannot use first and last together');
      }

      const { shop, accessToken, scope } = params;

      let first = 10;
      let paramsDefinition = '';
      let ordersParams = '';

      if (!query?.first && !query?.last) {
        first = 10;
        paramsDefinition = '$first: Int!';
        ordersParams = 'first: $first';
      }

      const variables: {
        first?: number;
        after?: string;
        last?: number;
        before?: string;
        query?: string;
      } = { first };

      if (query?.first) {
        first = query.first;
        variables['first'] = query.first;
        paramsDefinition = '$first: Int!';
        ordersParams = 'first: $first';
      }

      if (query?.after) {
        variables['after'] = query.after;
        paramsDefinition = `${paramsDefinition}, $after: String`;
        ordersParams = `${ordersParams}, after: $after`;
      }

      if (query?.last) {
        variables['last'] = query.last;
        variables['first'] = undefined;
        paramsDefinition = `$last: Int`;
        ordersParams = `last: $last`;
      }

      if (query?.before) {
        variables['before'] = query.before;
        paramsDefinition = `${paramsDefinition}, $before: String`;
        ordersParams = `${ordersParams}, before: $before`;
      }

      if (query?.query) {
        variables['query'] = query.query;
        paramsDefinition = `${paramsDefinition}, $query: String`;
        ordersParams = `${ordersParams}, query: $query`;
      }

      const client = this.createShopifyClientSession({
        shop,
        accessToken,
        scope,
      });

      const q = getOrdersQuery(paramsDefinition, ordersParams);

      const data = await client.query<{ data: any }>({
        data: {
          query: q,
          variables,
        },
      });

      return data;
    } catch (error: unknown) {
      if (error instanceof GraphqlQueryError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Something Went Wrong');
    }
  }

  async getOrdersCount(
    params: {
      shop: string;
      accessToken: string;
      scope: string;
    },
    query?: {
      query?: string;
    },
  ) {
    try {
      const { shop, accessToken, scope } = params;
      let paramsDefinition = '';
      let ordersParams = '';

      const variables: {
        query?: string;
      } = {};

      if (query?.query) {
        variables['query'] = query?.query;
        paramsDefinition = `($query: String)`;
        ordersParams = `(query: $query)`;
      }

      const client = this.createShopifyClientSession({
        shop,
        accessToken,
        scope,
      });

      const q = getOrdersCountQuery(paramsDefinition, ordersParams);

      const data = await client.query<{ data: any }>({
        data: {
          query: q,
          variables,
        },
      });

      return data;
    } catch (error: unknown) {
      if (error instanceof GraphqlQueryError) {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Something Went Wrong');
    }
  }
}
