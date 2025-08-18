import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AddGeotargetingToCampaignDto,
  AddKeywordsToAdGroupDto,
  CreateAdGroupAdDto,
  CreateAdGroupDto,
  CreateBudgetDto,
  CreateTargetRoasBiddingStrategyDto,
  CreateSearchCampaignDto,
  UpdateGoogleCampaignDto,
  CreateCustomerDto,
  CreateConversionActionDto,
  GenerateKeywordIdeasDto,
  GetCampaignByNameOrIdDto,
  GetConversionActionByNameOrIdDto,
  GetBiddingStrategyByNameOrIdDto,
  GetAdGroupByNameOrIdDto,
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

  async listAccessibleCustomers() {
    return await this.googleAdsCustomerApi.listAccessibleCustomers();
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
    dto: UpdateGoogleCampaignDto,
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
      currencyCode: dto.currencyCode,
      timeZone: dto.timeZone,
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

  async getConversionActionByNameOrId(dto: GetConversionActionByNameOrIdDto) {
    const { name, id, customerId } = dto;
    if (!name && !id) {
      throw new BadRequestException(
        'Either name or id must be provided to get campaign',
      );
    } else if (id) {
      return await this.googleAdsSearchApi.getConversionActionById(
        customerId,
        id,
      );
    } else {
      return await this.googleAdsSearchApi.getConversionActionByName(
        customerId,
        name!,
      );
    }
  }

  async getBiddingStrategyByNameOrId(dto: GetBiddingStrategyByNameOrIdDto) {
    const { name, id, customerId } = dto;
    if (!name && !id) {
      throw new BadRequestException(
        'Either name or id must be provided to get campaign',
      );
    } else if (id) {
      return await this.googleAdsSearchApi.getBiddingStrategyById(
        customerId,
        id,
      );
    } else {
      return await this.googleAdsSearchApi.getBiddingStrategyByName(
        customerId,
        name!,
      );
    }
  }

  async generateKeywordIdeas(
    dto: GenerateKeywordIdeasDto,
    q?: { pageSize?: number; pageToken?: string },
  ) {
    const { url, keywords } = dto;
    const body: {
      pageSize?: number;
      pageToken?: string;
      keywordAndUrlSeed?: { keywords: string[]; url: string };
      keywordSeed?: { keywords: string[] };
      urlSeed?: { url: string };
    } = {
      pageSize: q?.pageSize,
      pageToken: q?.pageToken,
    };

    if (!url && !keywords.length) {
      throw new BadRequestException(`url or keywords must be present`);
    }

    if (dto.url && dto.keywords) {
      body.keywordAndUrlSeed = {
        keywords,
        url,
      };
    } else if (keywords) {
      body.keywordSeed = {
        keywords,
      };
    } else {
      body.urlSeed = {
        url,
      };
    }

    const res = await this.googleAdsCustomerApi.generateKeywordIdeas(
      dto.customerId,
      body,
    );
    return res;
  }

  async getCampaignByNameOrId(dto: GetCampaignByNameOrIdDto) {
    const { name, id, customerId } = dto;
    if (!name && !id) {
      throw new BadRequestException(
        'Either name or id must be provided to get campaign',
      );
    } else if (id) {
      return await this.googleAdsSearchApi.getCampaignById(customerId, id);
    } else {
      return await this.googleAdsSearchApi.getCampaignByName(customerId, name!);
    }
  }

  async getAdGroupByNameOrId(dto: GetAdGroupByNameOrIdDto) {
    const { name, id, customerId, campaignResourceName } = dto;
    if (!name && !id) {
      throw new BadRequestException(
        'Either name or id must be provided to get campaign',
      );
    } else if (id) {
      return await this.googleAdsSearchApi.getAdGroupById(
        customerId,
        campaignResourceName,
        id,
      );
    } else {
      return await this.googleAdsSearchApi.getAdGroupByName(
        customerId,
        campaignResourceName,
        name!,
      );
    }
  }
}
