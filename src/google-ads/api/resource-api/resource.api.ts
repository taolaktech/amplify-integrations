import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import * as querystring from 'querystring';
import { AppConfigService } from 'src/config/config.service';
import {
  ConversionActionType,
  GoogleAdsAdGroupAdStatus,
  GoogleAdsAdGroupCriterionStatus,
  GoogleAdsAdGroupStatus,
  GoogleAdsAdGroupType,
  GoogleAdsAdvertisingChannelType,
  GoogleAdsBiddingStrategyStatus,
  GoogleAdsCampaignStatus,
  GoogleAdsResponseContentType,
  GoogleCampaignContainsEuPoliticalAdvertising,
} from './enums';
import {
  GoogleAdsAdGroup,
  GoogleAdsAdGroupAd,
  GoogleAdsBudget,
  GoogleAdsCampaign,
  GoogleAdsOperation,
  GoogleAdsResource,
  GoogleAdsRestBody,
  ResourceCreationResponse,
  GoogleAdsAdGroupCriterion,
  GoogleAdsCampaignCriterion,
  GoogleTokensResult,
  SuggestGeoTargetConstantsRequestBody,
  SuggestGeoTargetConstantsResponse,
  GoogleAdsBiddingStrategy,
  GoogleAdsConversionAction,
  GoogleAdsCustomerAsset,
  GoogleAdsAsset,
  GoogleAdsCampaignAsset,
} from './types';
import {
  AddGeoTargetingToCampaignBody,
  AddKeywordsToAdGroupBody,
  CreateAdGroupAdBody,
  CreateAdGroupBody,
  CreateAssetBody,
  CreateCampaignAssetBody,
  CreateCampaignBody,
  CreateConversionActionBody,
  CreateCustomerAssetBody,
  CreateTargetRoasBiddingStrategyBody,
  GoogleAdsResourceRequestOptions,
  UpdateCampaignBody,
} from '../../my-types';
import { GoogleAdsSharedMethodsService } from '../shared';

@Injectable()
export class GoogleAdsResourceApiService {
  private GOOGLE_CLIENT_ID: string;
  private GOOGLE_CLIENT_SECRET: string;
  private DRY_RUN = false;
  private logger = new Logger(GoogleAdsResourceApiService.name);

  constructor(
    private config: AppConfigService,
    private googleAdsSharedMethodsService: GoogleAdsSharedMethodsService,
  ) {
    this.GOOGLE_CLIENT_ID = this.config.get('GOOGLE_CLIENT_ID');
    this.GOOGLE_CLIENT_SECRET = this.config.get('GOOGLE_CLIENT_SECRET');
  }

  private async axiosInstance() {
    return await this.googleAdsSharedMethodsService.axiosInstance();
  }

  private extractCustomerIdFromResourceName(resourceName: string) {
    const parts = resourceName.split('/');
    return parts[1];
  }

  private extractResouceIdFromResourceName(resourceName: string) {
    const parts = resourceName.split('/');
    return parts[parts.length - 1];
  }

  private checkResourceAgainstAccount(
    customerId: string,
    resourceName: string,
  ) {
    const resourceCustomerId =
      this.extractCustomerIdFromResourceName(resourceName);
    if (customerId !== resourceCustomerId) {
      throw new BadRequestException(
        `Resource x customer mismatch- customer-${customerId}, resourceCustomerId-${resourceCustomerId} `,
      );
    }
    return customerId;
  }

  async getGoogleAccessTokenCall(params: {
    code?: string;
    refreshToken?: string;
    grantType: 'refresh_token' | 'authorization_code';
  }) {
    const values = {
      client_id: this.GOOGLE_CLIENT_ID,
      client_secret: this.GOOGLE_CLIENT_SECRET,
      grant_type: params.grantType,
      refresh_token: params.refreshToken,
      code: params.code,
      redirect_uri: `${this.config.get('API_URL')}/api/google/auth/redirect`,
    };
    try {
      const response = await axios.post<GoogleTokensResult>(
        'https://oauth2.googleapis.com/token',
        querystring.stringify(values),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return response.data;
    } catch (err: any) {
      console.error('error getting tokens');
      throw err;
    }
  }

  private mutateResourceErrorHandler(
    error: unknown,
    resource: GoogleAdsResource,
    customerId: string,
  ): Error {
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      const googleAdsError = error.response.data.error;

      // Loop through error details and extract errors
      for (const detail of googleAdsError.details || []) {
        if (Array.isArray(detail.errors)) {
          for (const err of detail.errors) {
            if (err.errorCode) {
              Object.keys(err.errorCode).forEach((key) => {
                if (
                  err.errorCode[key] === 'DUPLICATE_NAME' ||
                  err.errorCode[key] === 'DUPLICATE_ADGROUP_NAME' ||
                  err.errorCode[key] === 'DUPLICATE_ADGROUPAD_NAME'
                ) {
                  throw new BadRequestException({
                    message: `${resource} for customerId ${customerId} with the same name already exists`,
                    duplicateName: true,
                  });
                }
              });
            }
          }
        }
      }
      this.logger.log(`XXX Cannot complete ${resource} mutate operation XXX`);
      this.logger.log(error.response?.data);
      this.logger.error(JSON.stringify(error.response?.data || {}));
      throw new InternalServerErrorException({
        googleAdsError,
        mesage: 'Something went wrong while performing operation',
      });
    }
    throw error;
  }

  private async mutateResourceOperation<T>(
    resource: GoogleAdsResource,
    customerId: string,
    operations: GoogleAdsOperation<T>[],
    options?: GoogleAdsResourceRequestOptions,
  ) {
    try {
      const url = `/customers/${customerId}/${resource}:mutate`;
      const axios = await this.axiosInstance();
      const data: GoogleAdsRestBody<T> = {
        operations,
        validateOnly: this.DRY_RUN || options?.validateOnly,
        responseContentType: options?.responseContentType,
      };
      const res = await axios.post<ResourceCreationResponse>(url, data);
      return res.data;
    } catch (error: unknown) {
      this.mutateResourceErrorHandler(error, resource, customerId);
      throw new InternalServerErrorException(
        `Cannot complete ${resource} mutate operation for customerId ${customerId}`,
      );
    }
  }

  private async campaignBudgetMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsBudget>[],
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const resource = 'campaignBudgets';

    return await this.mutateResourceOperation<GoogleAdsBudget>(
      resource,
      customerId,
      operations,
      options,
    );
  }

  private async campaignMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsCampaign>[],
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const resource = 'campaigns';
    return await this.mutateResourceOperation<GoogleAdsCampaign>(
      resource,
      customerId,
      operations,
      options,
    );
  }

  private async adGroupsMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsAdGroup>[],
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const resource = 'adGroups';
    return await this.mutateResourceOperation<GoogleAdsAdGroup>(
      resource,
      customerId,
      operations,
      options,
    );
  }

  private async adGroupsAdsMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsAdGroupAd>[],
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const resource = 'adGroupAds';
    // customers/{customerId}/adGroupAds/{adGroupId}~{ad_id}
    return await this.mutateResourceOperation<GoogleAdsAdGroupAd>(
      resource,
      customerId,
      operations,
      options,
    );
  }

  private async adGroupCriteriaMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsAdGroupCriterion>[],
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const resource = 'adGroupCriteria';
    return await this.mutateResourceOperation<GoogleAdsAdGroupCriterion>(
      resource,
      customerId,
      operations,
      options,
    );
  }

  private async biddingStrategiesMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsBiddingStrategy>[],
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const resource = 'biddingStrategies';
    return await this.mutateResourceOperation<GoogleAdsBiddingStrategy>(
      resource,
      customerId,
      operations,
      options,
    );
  }

  private async campaignCriteriaMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsCampaignCriterion>[],
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const resource = 'campaignCriteria';
    return await this.mutateResourceOperation<GoogleAdsCampaignCriterion>(
      resource,
      customerId,
      operations,
      options,
    );
  }

  private async conversionActionMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsConversionAction>[],
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const resource = 'conversionActions';
    return await this.mutateResourceOperation<GoogleAdsConversionAction>(
      resource,
      customerId,
      operations,
      options,
    );
  }

  private async customerAssetsMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsCustomerAsset>[],
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const resource = 'customerAssets';
    return await this.mutateResourceOperation<GoogleAdsCustomerAsset>(
      resource,
      customerId,
      operations,
      options,
    );
  }

  private async campaignAssetsMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsCampaignAsset>[],
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const resource = 'campaignAssets';
    return await this.mutateResourceOperation<GoogleAdsCampaignAsset>(
      resource,
      customerId,
      operations,
      options,
    );
  }

  private async assetMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsAsset>[],
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const resource = 'assets';
    return await this.mutateResourceOperation<GoogleAdsAsset>(
      resource,
      customerId,
      operations,
      options,
    );
  }

  private async suggestGeoTargetConstants(
    payload: Partial<SuggestGeoTargetConstantsRequestBody>,
  ) {
    try {
      const url = `/geoTargetConstants:suggest`;
      const axios = await this.axiosInstance();
      const res = await axios.post<SuggestGeoTargetConstantsResponse>(
        url,
        payload,
      );
      return res.data;
    } catch (error: unknown) {
      this.logger.error(`Cannot complete geoTargetConstants:suggest`);
      if (error instanceof AxiosError) {
        this.logger.log(error.response?.data);
        this.logger.log(JSON.stringify(error.response?.data || {}));
        this.logger.log(error.response?.data?.error?.message);
      }
      throw error;
    }
  }

  async createBudget(
    customerId: string,
    body: { name: string; amountMicros: number },
    options?: GoogleAdsResourceRequestOptions,
  ) {
    try {
      const budget: Partial<GoogleAdsBudget> = {
        name: body.name,
        amountMicros: body.amountMicros,
      };

      const operations = [{ create: budget }];

      const res = await this.campaignBudgetMutateOperation(
        customerId,
        operations,
        options,
      );

      if (res.results?.length) {
        budget.resourceName = res.results[0].resourceName;
      }

      return { response: res, budget };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot create budget');
    }
  }

  async createTargetRoasBiddingStrategy(
    customerId: string,
    body: CreateTargetRoasBiddingStrategyBody,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    try {
      const biddingStrategy: Partial<GoogleAdsBiddingStrategy> = {
        name: body.name,
        status: GoogleAdsBiddingStrategyStatus.ENABLED,
        targetRoas: {
          targetRoas: body.targetRoas,
          cpcBidCeilingMicros: body.cpcBidCeilingMicros,
          cpcBidFloorMicros: body.cpcBidFloorMicros,
        },
      };
      const operations = [{ create: biddingStrategy }];
      const res = await this.biddingStrategiesMutateOperation(
        customerId,
        operations,
        options,
      );

      if (res.results?.length) {
        biddingStrategy.resourceName = res.results[0].resourceName;
      }

      return { response: res, biddingStrategy };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Cannot create target ROAS bidding strategy',
      );
    }
  }

  async createSearchCampaign(
    customerId: string,
    body: CreateCampaignBody,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    try {
      this.checkResourceAgainstAccount(customerId, body.campaignBudget);
      this.checkResourceAgainstAccount(customerId, body.biddingStrategy);

      const campaign: Partial<GoogleAdsCampaign> = {
        name: body.name,
        status: GoogleAdsCampaignStatus.ENABLED,
        campaignBudget: body.campaignBudget,
        advertisingChannelType: GoogleAdsAdvertisingChannelType.SEARCH,
        startDate: body.startDate.toISOString().split('T')[0],
        endDate: body.endDate.toISOString().split('T')[0],
        biddingStrategy: body.biddingStrategy,
        containsEuPoliticalAdvertising:
          GoogleCampaignContainsEuPoliticalAdvertising.DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING,
        networkSettings: {
          targetPartnerSearchNetwork: false,
          targetGoogleSearch: true,
          targetSearchNetwork: true,
          targetContentNetwork: true,
        },
      };
      const operations = [{ create: campaign }];

      const res = await this.campaignMutateOperation(
        customerId,
        operations,
        options,
      );

      if (res.results?.length) {
        campaign.resourceName = res.results[0].resourceName;
      }

      return { response: res, campaign };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot create search campaign');
    }
  }

  async createAdGroup(
    body: CreateAdGroupBody,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    try {
      const customerId = this.extractCustomerIdFromResourceName(
        body.campaignResourceName,
      );

      const adGroup: Partial<GoogleAdsAdGroup> = {
        name: `${body.adGroupName}`,
        status: GoogleAdsAdGroupStatus.ENABLED,
        campaign: `${body.campaignResourceName}`,
        type: GoogleAdsAdGroupType.SEARCH_STANDARD,
      };

      const operations = [{ create: adGroup }];

      const res = await this.adGroupsMutateOperation(
        customerId,
        operations,
        options,
      );

      if (res.results?.length) {
        adGroup.resourceName = res.results[0].resourceName;
      }

      return { response: res, adGroup };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot create adGroup');
    }
  }

  async createAdGroupAd(
    body: CreateAdGroupAdBody,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    const { finalUrls, headlines, descriptions, path1, path2 } = body;
    if (
      finalUrls.length < 1 ||
      headlines.length < 3 ||
      descriptions.length < 3
    ) {
      throw new BadRequestException(
        'finalUrls > 0, headlines >= 3, descriptions >=3. One of the conditions not met',
      );
    }

    try {
      const customerId = this.extractCustomerIdFromResourceName(
        body.adGroupResourceName,
      );

      const adGroupAd: Partial<GoogleAdsAdGroupAd> = {
        status: GoogleAdsAdGroupAdStatus.ENABLED,
        adGroup: `${body.adGroupResourceName}`,
        ad: {
          finalUrls,
          responsiveSearchAd: {
            headlines,
            descriptions,
            path1,
            path2,
          },
        },
      };

      const operations = [{ create: adGroupAd }];

      const res = await this.adGroupsAdsMutateOperation(
        customerId,
        operations,
        options,
      );

      if (res.results?.length) {
        adGroupAd.resourceName = res.results[0].resourceName;
      }

      return { response: res, adGroupAd };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot create adGroupAd');
    }
  }

  async addKeywordsToAdGroup(
    body: AddKeywordsToAdGroupBody,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    try {
      const customerId = this.extractCustomerIdFromResourceName(
        body.adGroupResourceName,
      );

      const operations: GoogleAdsOperation<GoogleAdsAdGroupCriterion>[] = [];

      const adGroupCriteria: Partial<GoogleAdsAdGroupCriterion>[] = [];

      body.keywords.forEach((keyword) => {
        adGroupCriteria.push({
          adGroup: `${body.adGroupResourceName}`,
          status: GoogleAdsAdGroupCriterionStatus.ENABLED,
          keyword: {
            text: keyword.text,
            matchType: keyword.matchType,
          },
        });
      });

      adGroupCriteria.forEach((criterion) => {
        operations.push({
          create: criterion,
        });
      });

      const res = await this.adGroupCriteriaMutateOperation(
        customerId,
        operations,
        options,
      );

      // append resourceNames
      if (res.results?.length) {
        adGroupCriteria.forEach((criterion, index) => {
          criterion.resourceName = res.results
            ? res.results[index].resourceName
            : undefined;
        });
      }

      return { response: res, adGroupCriteria };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot add keywords');
    }
  }

  async addGeoTargetingToCampaign(
    body: AddGeoTargetingToCampaignBody,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    try {
      const customerId = this.extractCustomerIdFromResourceName(
        body.campaignResourceName,
      );

      const gtc = {
        locale: body.locale ?? 'en', // defaults to en
        countryCode: body.countryCode,
        locationNames: {
          names: body.locationNames,
        },
      };

      const { geoTargetConstantSuggestions } =
        await this.suggestGeoTargetConstants(gtc);

      const operations: GoogleAdsOperation<GoogleAdsCampaignCriterion>[] = [];

      const campaignCriteria: Partial<GoogleAdsCampaignCriterion>[] = [];

      geoTargetConstantSuggestions.forEach((geoTargetConstantSuggestion) => {
        campaignCriteria.push({
          campaign: body.campaignResourceName,
          location: {
            geoTargetConstant:
              geoTargetConstantSuggestion.geoTargetConstant.resourceName,
          },
        });
      });

      campaignCriteria.forEach((campaignCriterion) => {
        operations.push({
          create: campaignCriterion,
        });
      });

      const res = await this.campaignCriteriaMutateOperation(
        customerId,
        operations,
        options,
      );

      campaignCriteria.forEach((criterion, index) => {
        criterion.resourceName = criterion.resourceName = res.results
          ? res.results[index].resourceName
          : undefined;
      });

      return { response: res, campaignCriteria };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot add geo targeting');
    }
  }

  async updateCampaign(
    body: UpdateCampaignBody,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    try {
      if (!body.campaign.resourceName) {
        throw new BadRequestException('campaign.resourceName required');
      }

      const customerId = this.extractCustomerIdFromResourceName(
        body.campaign.resourceName,
      );

      const operations = [
        { updateMask: body.updateMask, update: body.campaign },
      ];

      const res = await this.campaignMutateOperation(customerId, operations, {
        ...options,
        responseContentType: GoogleAdsResponseContentType.MUTABLE_RESOURCE,
      });

      return { response: res };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot update campaign');
    }
  }

  async createConversionAction(
    body: CreateConversionActionBody,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    try {
      const conversionAction: Partial<GoogleAdsConversionAction> = {
        name: body.name,
        type: ConversionActionType.WEBPAGE,
      };

      const operations = [{ create: conversionAction }];

      const res = await this.conversionActionMutateOperation(
        body.customerId,
        operations,
        options,
      );

      if (res.results?.length) {
        conversionAction.resourceName = res.results[0].resourceName;
      }

      return { response: res, conversionAction };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot create adGroup');
    }
  }

  async createAsset(
    body: CreateAssetBody,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    try {
      const asset: Partial<GoogleAdsAsset> = {
        type: body.type,
        finalUrls: body.finalUrls,
        textAsset: body.text ? { text: body.text } : undefined,
        imageAsset: body.image ? { data: body.image } : undefined,
        name: body.name,
      };

      const operations = [{ create: asset }];

      const res = await this.assetMutateOperation(
        body.customerId,
        operations,
        options,
      );

      if (res.results?.length) {
        asset.resourceName = res.results[0].resourceName;
      }

      return { response: res, asset };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot create customer asset');
    }
  }

  async createCustomerAsset(
    body: CreateCustomerAssetBody,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    try {
      const customerAsset: Partial<GoogleAdsCustomerAsset> = {
        asset: body.assetResourceName,
        fieldType: body.assetFieldType,
        status: 'ENABLED',
      };

      const operations = [{ create: customerAsset }];

      const res = await this.customerAssetsMutateOperation(
        body.customerId,
        operations,
        options,
      );

      if (res.results?.length) {
        customerAsset.resourceName = res.results[0].resourceName;
      }

      return { response: res, customerAsset };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot create customer asset');
    }
  }

  async createCampaignAsset(
    body: CreateCampaignAssetBody,
    options?: GoogleAdsResourceRequestOptions,
  ) {
    try {
      const campaignAsset: Partial<GoogleAdsCampaignAsset> = {
        asset: body.assetResourceName,
        fieldType: body.assetFieldType,
        status: 'ENABLED',
        campaign: body.campaignResourceName,
      };

      const customerId = this.extractCustomerIdFromResourceName(
        body.campaignResourceName,
      );

      const operations = [{ create: campaignAsset }];

      const res = await this.campaignAssetsMutateOperation(
        customerId,
        operations,
        options,
      );

      if (res.results?.length) {
        campaignAsset.resourceName = res.results[0].resourceName;
      }

      return { response: res, campaignAsset };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot create customer asset');
    }
  }
}
