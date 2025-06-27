import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AddGeotargetingToCampaignDto,
  AddKeywordsToAdGroupDto,
  CreateAdGroupAdDto,
  CreateAdGroupDto,
  CreateBudgetDto,
  CreateSearchCampaignDto,
} from './dto';

import { GoogleAdsApi } from './google-ads.api';
import {
  GoogleAdsKeywordMatchType,
  GoogleAdsServedAssetFieldType,
} from './google-ads.enum';

@Injectable()
export class GoogleAdsService {
  private ONE_CURRENCY_UNIT = 1_000_000;

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
    const body = {
      name: dto.campaignBudgetName,
      amountMicros: dto.amount * this.ONE_CURRENCY_UNIT,
    };
    const response = await this.googleAdsApi.createBudget(dto.account, body);
    return response;
  }

  async createSearchCampaign(dto: CreateSearchCampaignDto) {
    const body = {
      campaignBudget: dto.budgetResourceName,
      name: dto.campaignName,
    };
    const response = await this.googleAdsApi.createSearchCampaign(
      dto.account,
      body,
    );
    return response;
  }

  async createAdGroup(dto: CreateAdGroupDto) {
    const body = {
      adGroupName: dto.adGroupName,
      campaignResourceName: dto.campaignResourceName,
    };
    const response = await this.googleAdsApi.createAdGroup(body);
    return response;
  }

  async createAdGroupAd(dto: CreateAdGroupAdDto) {
    if (dto.path2 && !dto.path1) {
      throw new BadRequestException(
        `path1 must be present if path2 is present`,
      );
    }
    const headlines = dto.headlines.map((txt, index) => {
      let pinnedField: GoogleAdsServedAssetFieldType | undefined = undefined;
      if (index === 0) {
        pinnedField = GoogleAdsServedAssetFieldType.HEADLINE_1;
      }
      return { text: txt, pinnedField };
    });

    const descriptions = dto.headlines.map((txt) => {
      return { text: txt };
    });

    const body = {
      adGroupAdName: dto.adGroupAdName,
      adGroupResourceName: dto.adGroupResourceName,
      finalUrls: dto.finalUrls,
      headlines,
      descriptions,
      path1: dto.path1,
      path2: dto.path2,
    };

    const response = await this.googleAdsApi.createAdGroupAd(body);
    return response;
  }

  async addKeywordsToAdGroup(dto: AddKeywordsToAdGroupDto) {
    const keywords: { text: string; matchType: GoogleAdsKeywordMatchType }[] =
      [];

    dto.broadMatchKeywords.forEach((txt) => {
      keywords.push({ text: txt, matchType: GoogleAdsKeywordMatchType.BROAD });
    });

    dto.exactMatchKeywords.forEach((txt) => {
      keywords.push({ text: txt, matchType: GoogleAdsKeywordMatchType.EXACT });
    });

    dto.phraseMatchKeywords.forEach((txt) => {
      keywords.push({ text: txt, matchType: GoogleAdsKeywordMatchType.PHRASE });
    });

    const body = {
      adGroupResourceName: dto.adGroupResourceName,
      keywords,
    };

    const response = await this.googleAdsApi.addKeywordsToAdGroup(body);

    return response;
  }

  // async addGeolocation

  async addGeoTargetingToCampaign(dto: AddGeotargetingToCampaignDto) {
    const body = {
      campaignResourceName: dto.campaignResourceName,
      locale: dto.locale,
      countryCode: dto.countryCode,
      locationNames: dto.locationNames,
    };

    const res = this.googleAdsApi.addGeoTargetingToCampaign(body);

    return res;
  }
}
