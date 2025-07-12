import { Injectable, Logger } from '@nestjs/common';
import { AxiosError } from 'axios';
import {
  CreateCustomerRequestBody,
  CreateCustomerResponse,
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
    method: GoogleAdsCustomerMethod,
    customerId: string,
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
        this.logger.log(JSON.stringify(error.response?.data || {}));
        this.logger.log(error.response?.data?.error?.message);
      }
      throw error;
    }
  }

  async createCustomer(
    data: CreateCustomerRequestBody['customerClient'],
    q?: any,
  ) {
    const body: Partial<CreateCustomerRequestBody> = {
      customerClient: {
        ...data,
        testAccount: this.config.get('NODE_ENV') !== 'production',
      },
      // accessRole: AccessRole.ACCESS_ROLE_MANAGER,
      validateOnly: q?.validateOnly ?? false,
      emailAddress: 'test@example.com',
    };
    const customerId =
      this.googleAdsSharedMethodsService.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
    const res = await this.customerOperation<
      CreateCustomerRequestBody,
      CreateCustomerResponse
    >('createCustomerClient', customerId, body);
    return res;
  }
}
