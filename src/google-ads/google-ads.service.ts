import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AddGeotargetingToCampaignDto,
  AddKeywordsToAdGroupDto,
  CreateAdGroupAdDto,
  CreateAdGroupDto,
  CreateBudgetDto,
  CreateSearchCampaignDto,
  UpdateCampaignDto,
} from './dto';

import { GoogleAdsApi } from './google-ads.api';
import {
  GoogleAdsKeywordMatchType,
  GoogleAdsServedAssetFieldType,
} from './google-ads.enum';
import { GoogleAdsRequestOptions } from './my-types';

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

  async createBudget(dto: CreateBudgetDto, options?: GoogleAdsRequestOptions) {
    const body = {
      name: dto.campaignBudgetName,
      amountMicros: dto.amount * this.ONE_CURRENCY_UNIT,
    };
    const response = await this.googleAdsApi.createBudget(
      dto.account,
      body,
      options,
    );
    return response;
  }

  async createSearchCampaign(
    dto: CreateSearchCampaignDto,
    options?: GoogleAdsRequestOptions,
  ) {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must be greater than startDate');
    }
    const body = {
      campaignBudget: dto.budgetResourceName,
      name: dto.campaignName,
      startDate: dto.startDate,
      endDate: dto.endDate,
      targetRoas: dto.targetRoas,
    };
    const response = await this.googleAdsApi.createSearchCampaign(
      dto.account,
      body,
      options,
    );
    return response;
  }

  async createAdGroup(
    dto: CreateAdGroupDto,
    options?: GoogleAdsRequestOptions,
  ) {
    const body = {
      adGroupName: dto.adGroupName,
      campaignResourceName: dto.campaignResourceName,
    };
    const response = await this.googleAdsApi.createAdGroup(body, options);
    return response;
  }

  async createAdGroupAd(
    dto: CreateAdGroupAdDto,
    options?: GoogleAdsRequestOptions,
  ) {
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

    const response = await this.googleAdsApi.createAdGroupAd(body, options);
    return response;
  }

  async addKeywordsToAdGroup(
    dto: AddKeywordsToAdGroupDto,
    options?: GoogleAdsRequestOptions,
  ) {
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

    const response = await this.googleAdsApi.addKeywordsToAdGroup(
      body,
      options,
    );

    return response;
  }

  // async addGeolocation

  async addGeoTargetingToCampaign(
    dto: AddGeotargetingToCampaignDto,
    options?: GoogleAdsRequestOptions,
  ) {
    const body = {
      campaignResourceName: dto.campaignResourceName,
      locale: dto.locale,
      countryCode: dto.countryCode,
      locationNames: dto.locationNames,
    };

    const res = this.googleAdsApi.addGeoTargetingToCampaign(body, options);

    return res;
  }

  async updateCampaignStatus(
    dto: UpdateCampaignDto,
    options?: GoogleAdsRequestOptions,
  ) {
    const body = {
      updateMask: 'status',
      campaign: {
        resourceName: dto.campaignResourceName,
        status: dto.status,
      },
    };

    const res = this.googleAdsApi.updateCampaign(body, options);

    return res;
  }
}
