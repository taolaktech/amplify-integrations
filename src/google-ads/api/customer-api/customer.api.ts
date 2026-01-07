import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import {
  CreateCustomerRequestBody,
  CreateCustomerResponse,
  GenerateKeywordIdeasRequestBody,
  GenerateKeywordIdeasResponse,
  GoogleAdsCustomerMethod,
} from './types';
import { GoogleAdsSharedMethodsService } from '../shared';
import { AppConfigService } from 'src/config/config.service';
import { GoogleAdsConnectionTokenService } from '../../services/google-ads-connection-token.service';

@Injectable()
export class GoogleAdsCustomerApiService {
  logger = new Logger(GoogleAdsCustomerApiService.name);

  constructor(
    private googleAdsSharedMethodsService: GoogleAdsSharedMethodsService,
    private config: AppConfigService,
    private googleAdsConnectionTokenService: GoogleAdsConnectionTokenService,
  ) {}

  private async axiosInstance(options: {
    connectionId: string;
    loginCustomerId?: string;
  }) {
    const accessToken =
      await this.googleAdsConnectionTokenService.getAccessToken({
        connectionId: options.connectionId,
      });

    const loginCustomerId =
      options.loginCustomerId ??
      (
        await this.googleAdsConnectionTokenService.getAuthContext({
          connectionId: options.connectionId,
        })
      ).loginCustomerId;

    return this.googleAdsSharedMethodsService.axiosInstanceWithAccessToken({
      accessToken,
      loginCustomerId,
    });
  }

  private async customerOperation<T, R>(
    customerId: string,
    method: GoogleAdsCustomerMethod,
    data: Partial<T>,
    options: { connectionId: string },
  ) {
    try {
      const url = `/customers/${customerId}:${method}`;

      const axios = await this.axiosInstance(options);

      const res = await axios.post<R>(url, data);

      return res.data;
    } catch (error: unknown) {
      this.logger.error(`Cannot complete ${method} customer operation`);
      if (error instanceof AxiosError) {
        this.logger.log(error.response?.data);
        this.logger.error(JSON.stringify(error.response?.data || {}));
        this.logger.log(error.response?.data?.error?.message);
      }
      throw new InternalServerErrorException(
        `Cannot complete ${method} customer operation`,
      );
    }
  }

  private async customerOperationWithoutId<R>(
    method: GoogleAdsCustomerMethod,
    options: { connectionId: string },
  ) {
    try {
      const url = `/customers:${method}`;

      const axios = await this.axiosInstance(options);

      const res = await axios.get<R>(url);

      return res.data;
    } catch (error: unknown) {
      this.logger.error(`Cannot complete ${method} customer operation`);
      if (error instanceof AxiosError) {
        this.logger.log(error.response?.data);
        this.logger.error(JSON.stringify(error.response?.data || {}));
        this.logger.log(error.response?.data?.error?.message);
      }
      throw new InternalServerErrorException(
        `Cannot complete ${method} customer operation`,
      );
    }
  }

  async createCustomer(
    data: CreateCustomerRequestBody['customerClient'],
    q?: any,
    options?: { connectionId: string },
  ) {
    const body: Partial<CreateCustomerRequestBody> = {
      customerClient: {
        ...data,
        testAccount: this.config.get('NODE_ENV') !== 'production',
      },
      validateOnly: q?.validateOnly ?? false,
    };
    if (!options?.connectionId) {
      throw new InternalServerErrorException('connectionId is required');
    }

    const { loginCustomerId } =
      await this.googleAdsConnectionTokenService.getAuthContext({
        connectionId: options.connectionId,
      });

    const customerId = loginCustomerId;

    const res = await this.customerOperation<
      CreateCustomerRequestBody,
      CreateCustomerResponse
    >(customerId, 'createCustomerClient', body, options);
    return res;
  }

  async generateKeywordIdeas(
    customerId: string,
    data: Partial<GenerateKeywordIdeasRequestBody>,
    options: { connectionId: string },
  ) {
    const res = await this.customerOperation<
      GenerateKeywordIdeasRequestBody,
      GenerateKeywordIdeasResponse
    >(customerId, 'generateKeywordIdeas', data, options);

    return res;
  }

  async listAccessibleCustomers(options: { connectionId: string }) {
    const res = await this.customerOperationWithoutId<{
      resourceNames: string[];
    }>('listAccessibleCustomers', options);
    return res;
  }
}
