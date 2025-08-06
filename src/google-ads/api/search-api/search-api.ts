import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AxiosError } from 'axios';

import { GoogleAdsSharedMethodsService } from '../shared';

@Injectable()
export class GoogleAdsSearchApiService {
  logger = new Logger(GoogleAdsSearchApiService.name);

  constructor(
    private googleAdsSharedMethodsService: GoogleAdsSharedMethodsService,
  ) {}

  private async axiosInstance() {
    return await this.googleAdsSharedMethodsService.axiosInstance();
  }

  private async searchOrSearchStream<R>(
    method: 'search' | 'searchStream',
    customerId: string,
    query: string,
  ) {
    try {
      const url = `/customers/${customerId}/googleAds:${method}`;
      const axios = await this.axiosInstance();
      const res = await axios.post<R>(url, { query });
      return res.data;
    } catch (error: unknown) {
      this.logger.error(`Cannot complete ${method} customer operation`);
      if (error instanceof AxiosError) {
        this.logger.log(error.response?.data);
        this.logger.log(JSON.stringify(error.response?.data || {}));
        this.logger.log(error.response?.data?.error?.message);
        throw new InternalServerErrorException({
          error: error.response?.data?.error,
          query,
        });
      }
      throw new InternalServerErrorException(
        'cannot complete action at this time',
      );
    }
  }

  private async googleAdsSearchStream<R>(customerId: string, query: string) {
    return await this.searchOrSearchStream<R>(
      'searchStream',
      customerId,
      query,
    );
  }

  private async googleAdsSearch<R>(customerId: string, query: string) {
    return await this.searchOrSearchStream<R>('search', customerId, query);
  }

  async getCampaignById(customerId: string, campaignId: string) {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.campaign_budget,
        campaign.status,
        campaign.bidding_strategy,
        campaign.bidding_strategy_type
      FROM campaign
      WHERE campaign.id=${campaignId}
    `;

    return await this.googleAdsSearch(customerId, query);
  }

  async getCampaignByName(customerId: string, campaignName: string) {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.campaign_budget,
        campaign.status,
        campaign.bidding_strategy,
        campaign.bidding_strategy_type
      FROM campaign
      WHERE campaign.name='${campaignName}'
    `;

    return await this.googleAdsSearch(customerId, query);
  }

  async getConversionActions(customerId: string) {
    const query = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.tag_snippets
      FROM conversion_action
      ORDER BY conversion_action.id DESC
    `;

    return await this.googleAdsSearch(customerId, query);
  }

  async getConversionActionById(
    customerId: string,
    conversionActionId: string,
  ) {
    const query = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.tag_snippets
      FROM conversion_action
      WHERE conversion_action.id=${conversionActionId}
    `;

    return await this.googleAdsSearch(customerId, query);
  }
}
