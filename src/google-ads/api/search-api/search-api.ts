import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AxiosError } from 'axios';

import { GoogleAdsSharedMethodsService } from '../shared';
import { GetBatchGoogleCampaignMetricsResponse } from './types';
import { GoogleAdsConnectionTokenService } from '../../services/google-ads-connection-token.service';

@Injectable()
export class GoogleAdsSearchApiService {
  logger = new Logger(GoogleAdsSearchApiService.name);

  constructor(
    private googleAdsSharedMethodsService: GoogleAdsSharedMethodsService,
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

  private async searchOrSearchStream<R>(
    method: 'search' | 'searchStream',
    customerId: string,
    query: string,
    options: { connectionId: string },
  ) {
    try {
      const url = `/customers/${customerId}/googleAds:${method}`;
      const axios = await this.axiosInstance(options);
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

  private async googleAdsSearchStream<R>(
    customerId: string,
    query: string,
    options: { connectionId: string },
  ) {
    return await this.searchOrSearchStream<R>(
      'searchStream',
      customerId,
      query,
      options,
    );
  }

  private async googleAdsSearch<R>(
    customerId: string,
    query: string,
    options: { connectionId: string },
  ) {
    return await this.searchOrSearchStream<R>(
      'search',
      customerId,
      query,
      options,
    );
  }

  async getCampaignById(
    customerId: string,
    campaignId: string,
    options: { connectionId: string },
  ) {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.campaign_budget,
        campaign.primary_status,
        campaign.status,
        campaign.bidding_strategy,
        campaign.bidding_strategy_type
      FROM campaign
      WHERE campaign.id=${campaignId}
    `;

    return await this.googleAdsSearch(customerId, query, options);
  }

  async getCampaignByName(
    customerId: string,
    campaignName: string,
    options: { connectionId: string },
  ) {
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

    return await this.googleAdsSearch(customerId, query, options);
  }

  async getCampaignMetrics(
    customerId: string,
    campaignId: string,
    options: { connectionId: string },
  ) {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_micros,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions_from_interactions_rate,
        metrics.value_per_conversion
      FROM campaign
      WHERE campaign.id='${campaignId}'
    `;

    return await this.googleAdsSearch(customerId, query, options);
  }

  async getCampaignMetricsBatch(
    customerId: string,
    campaignIds: string[],
    options: { connectionId: string },
  ) {
    const ids = campaignIds.join(',');
    const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.conversions_value,
      metrics.cost_micros,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.conversions_from_interactions_rate,
      metrics.value_per_conversion
    FROM campaign
    WHERE campaign.id IN (${ids})
  `;

    const streamResponse =
      await this.googleAdsSearchStream<GetBatchGoogleCampaignMetricsResponse>(
        customerId,
        query,
        options,
      );
    return streamResponse;
  }

  async getConversionActions(
    customerId: string,
    options: { connectionId: string },
  ) {
    const query = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.tag_snippets
      FROM conversion_action
      ORDER BY conversion_action.id DESC
    `;

    return await this.googleAdsSearch(customerId, query, options);
  }

  async getConversionActionById(
    customerId: string,
    conversionActionId: string,
    options: { connectionId: string },
  ) {
    const query = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.tag_snippets
      FROM conversion_action
      WHERE conversion_action.id=${conversionActionId}
    `;

    return await this.googleAdsSearch(customerId, query, options);
  }

  async getConversionActionByName(
    customerId: string,
    conversionActionName: string,
    options: { connectionId: string },
  ) {
    const query = `
      SELECT
        conversion_action.id,
        conversion_action.name,
        conversion_action.tag_snippets
      FROM conversion_action
      WHERE conversion_action.name='${conversionActionName}'
    `;

    return await this.googleAdsSearch(customerId, query, options);
  }

  async getBiddingStrategyById(
    customerId: string,
    biddingStrategyId: string,
    options: { connectionId: string },
  ) {
    const query = `
      SELECT
        bidding_strategy.id,
        bidding_strategy.name,
        bidding_strategy.type,
        bidding_strategy.target_roas.target_roas,
        bidding_strategy.target_cpa.target_cpa_micros
      FROM bidding_strategy
      WHERE bidding_strategy.id = ${biddingStrategyId}
    `;

    return await this.googleAdsSearch(customerId, query, options);
  }

  async getBiddingStrategyByName(
    customerId: string,
    biddingStrategyName: string,
    options: { connectionId: string },
  ) {
    const query = `
      SELECT
        bidding_strategy.id,
        bidding_strategy.name,
        bidding_strategy.type,
        bidding_strategy.target_roas.target_roas,
        bidding_strategy.target_cpa.target_cpa_micros
      FROM bidding_strategy
      WHERE bidding_strategy.name = '${biddingStrategyName}'
    `;

    return await this.googleAdsSearch(customerId, query, options);
  }

  async getAdGroupByName(
    customerId: string,
    campaignResourceName: string,
    adGroupName: string,
    options: { connectionId: string },
  ) {
    const query = `
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.campaign
      FROM ad_group
      WHERE ad_group.campaign = '${campaignResourceName}'
      AND ad_group.name = '${adGroupName}'
    `;

    return await this.googleAdsSearch(customerId, query, options);
  }

  async getAdGroupById(
    customerId: string,
    campaignResourceName: string,
    adGroupId: string,
    options: { connectionId: string },
  ) {
    const query = `
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.campaign
      FROM ad_group
      WHERE ad_group.campaign = '${campaignResourceName}'
      AND ad_group.id = '${adGroupId}'
    `;

    return await this.googleAdsSearch(customerId, query, options);
  }

  async getAdGroupMetrics(
    customerId: string,
    campaignResourceName: string,
    adGroupId: string,
    options: { connectionId: string },
  ) {
    const query = `
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.campaign,
        ad_group.type,
        ad_group.ad_rotation_mode,
        ad_group.cpc_bid_micros,
        ad_group.effective_cpc_bid_micros,
        ad_group.tracking_url_template,
        ad_group.cpm_bid_micros,
        ad_group.target_cpa_micros,
        ad_group.cpv_bid_micros,
        ad_group.target_cpm_micros,
        ad_group.percent_cpc_bid_micros,
        ad_group.fixed_cpm_micros,
        ad_group.target_cpv_micros,
        ad_group.effective_target_cpa_micros,
        ad_group.effective_target_roas,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions_from_interactions_rate,
        metrics.value_per_conversion
      FROM ad_group
      WHERE ad_group.campaign = '${campaignResourceName}'
      AND ad_group.id = '${adGroupId}'
    `;

    return await this.googleAdsSearch(customerId, query, options);
  }
}
