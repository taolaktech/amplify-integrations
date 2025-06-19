import { Injectable } from '@nestjs/common';
import {
  CreateAdGroupDto,
  CreateBudgetDto,
  CreateSearchCampaignDto,
} from './dto';

import { GoogleAdsApi } from './google-ads.api';

@Injectable()
export class GoogleAdsService {
  constructor(private googleAdsApi: GoogleAdsApi) {}

  getGoogleAuthUrl(): string {
    return this.googleAdsApi.getGoogleAuthUrl();
  }

  async googleAuthCallbackHandler(params: any) {
    return this.googleAdsApi.googleAuthCallbackHandler(params);
  }

  async getOauthTokensWithCode(code: string) {
    try {
      const tokensData = await this.googleAdsApi.getGoogleAccessTokenCall({
        code,
        grantType: 'authorization_code',
      });
      return tokensData;
    } catch (err: any) {
      console.error('error getting tokens');
      throw err;
    }
  }

  async createBudget(dto: CreateBudgetDto) {
    const body = { name: dto.name, amountMicros: dto.amount * 1_000_000 };
    const response = await this.googleAdsApi.createBudget(dto.account, body);
    return response;
  }

  async createSearchCampaign(dto: CreateSearchCampaignDto) {
    const body = { campaignBudget: dto.budget, name: dto.name };
    const response = await this.googleAdsApi.createSearchCampaign(
      dto.account,
      body,
    );
    return response;
  }

  async createAdGroup(dto: CreateAdGroupDto) {
    const body = { adGroupName: dto.name, campaignResourceName: dto.campaign };
    const response = await this.googleAdsApi.createAdGroup(body);
    return response;
  }
}
