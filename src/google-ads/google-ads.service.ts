import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AddGeotargetingToCampaignDto,
  AddKeywordsToAdGroupDto,
  CreateAdGroupAdDto,
  CreateAdGroupDto,
  CreateBudgetDto,
  CreateTargetRoasBiddingStrategyDto,
  CreateSearchCampaignDto,
  UpdateCampaignDto,
  CreateCustomerDto,
  CreateConversionActionDto,
} from './dto';

import { GoogleAdsResourceApiService } from './api/resource-api/resource.api';
import {
  GoogleAdsKeywordMatchType,
  GoogleAdsServedAssetFieldType,
} from './api/resource-api/enums';
import { GoogleAdsResourceRequestOptions } from './my-types';
import { GoogleAdsAuthApiService } from './api/auth-api/auth.api';
import { GoogleAdsCustomerApiService } from './api/customer-api/customer.api';
import { GoogleAdsSearchApiService } from './api/search-api/search-api';

@Injectable()
export class GoogleAdsService {
  private ONE_CURRENCY_UNIT = 1_000_000;

  constructor(
    private googleAdsResourceApi: GoogleAdsResourceApiService,
    private googleAdsAuthApiService: GoogleAdsAuthApiService,
    private googleAdsCustomerApi: GoogleAdsCustomerApiService,
    private googleAdsSearchApi: GoogleAdsSearchApiService,
  ) {}

  getGoogleAuthUrl(): string {
    return this.googleAdsAuthApiService.getGoogleAuthUrl();
  }

  async googleAuthCallbackHandler(params: any) {
    return await this.googleAdsAuthApiService.googleAuthCallbackHandler(params);
  }

  async getOauthTokensWithCode(code: string) {
    try {
      const tokensData =
        await this.googleAdsResourceApi.getGoogleAccessTokenCall({
          code,
          grantType: 'authorization_code',
        });
      return tokensData;
    } catch (err: any) {
      console.error('error getting tokens');
      throw err;
    }
  }

  async createTargetRoasBiddingStrategy(
    dto: CreateTargetRoasBiddingStrategyDto,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const body = {
      name: dto.biddingStrategyName,
      targetRoas: dto.targetRoas,
      cpcBidCeilingMicros: dto.cpcBidCeiling * this.ONE_CURRENCY_UNIT,
      cpcBidFloorMicros: dto.cpcBidFloor * this.ONE_CURRENCY_UNIT,
    };

    const response =
      await this.googleAdsResourceApi.createTargetRoasBiddingStrategy(
        dto.customerId,
        body,
        options,
      );
    return response;
  }

  async createBudget(
    dto: CreateBudgetDto,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const body = {
      name: dto.campaignBudgetName,
      amountMicros: dto.amount * this.ONE_CURRENCY_UNIT,
    };
    const response = await this.googleAdsResourceApi.createBudget(
      dto.customerId,
      body,
      options,
    );
    return response;
  }

  async createSearchCampaign(
    dto: CreateSearchCampaignDto,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    if (dto.endDate < dto.startDate) {
      throw new BadRequestException('endDate must be greater than startDate');
    }
    const body = {
      campaignBudget: dto.budgetResourceName,
      name: dto.campaignName,
      startDate: dto.startDate,
      endDate: dto.endDate,
      biddingStrategy: dto.biddingStrategy,
    };
    const response = await this.googleAdsResourceApi.createSearchCampaign(
      dto.customerId,
      body,
      options,
    );
    return response;
  }

  async createAdGroup(
    dto: CreateAdGroupDto,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const body = {
      adGroupName: dto.adGroupName,
      campaignResourceName: dto.campaignResourceName,
    };
    const response = await this.googleAdsResourceApi.createAdGroup(
      body,
      options,
    );
    return response;
  }

  async createAdGroupAd(
    dto: CreateAdGroupAdDto,
    options?: GoogleAdsResourceRequestOptions,
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

    const response = await this.googleAdsResourceApi.createAdGroupAd(
      body,
      options,
    );
    return response;
  }

  async addKeywordsToAdGroup(
    dto: AddKeywordsToAdGroupDto,
    options?: GoogleAdsResourceRequestOptions,
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

    const response = await this.googleAdsResourceApi.addKeywordsToAdGroup(
      body,
      options,
    );

    return response;
  }

  // async addGeolocation

  async addGeoTargetingToCampaign(
    dto: AddGeotargetingToCampaignDto,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const body = {
      campaignResourceName: dto.campaignResourceName,
      locale: dto.locale,
      countryCode: dto.countryCode,
      locationNames: dto.locationNames,
    };

    const res = this.googleAdsResourceApi.addGeoTargetingToCampaign(
      body,
      options,
    );

    return res;
  }

  async updateCampaignStatus(
    dto: UpdateCampaignDto,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const body = {
      updateMask: 'status',
      campaign: {
        resourceName: dto.campaignResourceName,
        status: dto.status,
      },
    };

    const res = this.googleAdsResourceApi.updateCampaign(body, options);

    return res;
  }

  async createCustomer(dto: CreateCustomerDto, q?: any) {
    const body = {
      descriptiveName: dto.customerName,
    };
    const res = await this.googleAdsCustomerApi.createCustomer(body, q);
    return res;
  }

  async createConversionAction(
    dto: CreateConversionActionDto,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const body = {
      name: dto.name,
      customerId: dto.customerId,
    };
    const res = await this.googleAdsResourceApi.createConversionAction(
      body,
      options,
    );
    return res;
  }

  async getConversionActions(customerId: string) {
    const res = await this.googleAdsSearchApi.getConversionActions(customerId);
    return res;
  }
}
