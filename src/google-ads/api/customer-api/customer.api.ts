import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import {
  AccessRole,
  CreateCustomerRequestBody,
  CreateCustomerResponse,
  GenerateKeywordIdeasRequestBody,
  GenerateKeywordIdeasResponse,
  GoogleAdsCustomerMethod,
} from './types';
import { GoogleAdsSharedMethodsService } from '../shared';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class GoogleAdsCustomerApiService {
  logger = new Logger(GoogleAdsCustomerApiService.name);

  constructor(
    private googleAdsSharedMethodsService: GoogleAdsSharedMethodsService,
    private config: AppConfigService,
  ) {}

  private async axiosInstance() {
    return await this.googleAdsSharedMethodsService.axiosInstance();
  }

  private async customerOperation<T, R>(
    customerId: string,
    method: GoogleAdsCustomerMethod,
    data: Partial<T>,
  ) {
    try {
      const url = `/customers/${customerId}:${method}`;

      const axios = await this.axiosInstance();

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

  async createCustomer(
    data: CreateCustomerRequestBody['customerClient'],
    emailAddress: string,
    accessRole: AccessRole,
    q?: any,
  ) {
    const body: Partial<CreateCustomerRequestBody> = {
      customerClient: {
        ...data,
        testAccount: this.config.get('NODE_ENV') !== 'production',
      },
      emailAddress,
      accessRole,
      validateOnly: q?.validateOnly ?? false,
    };
    const customerId =
      this.googleAdsSharedMethodsService.GOOGLE_ADS_LOGIN_CUSTOMER_ID;

    const res = await this.customerOperation<
      CreateCustomerRequestBody,
      CreateCustomerResponse
    >(customerId, 'createCustomerClient', body);
    return res;
  }

  async generateKeywordIdeas(
    customerId: string,
    data: Partial<GenerateKeywordIdeasRequestBody>,
  ) {
    const res = await this.customerOperation<
      GenerateKeywordIdeasRequestBody,
      GenerateKeywordIdeasResponse
    >(customerId, 'generateKeywordIdeas', data);

    return res;
  }
}
