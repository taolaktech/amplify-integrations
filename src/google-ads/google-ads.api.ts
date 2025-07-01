import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { DateTime } from 'luxon';
import axios, { AxiosError } from 'axios';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import * as querystring from 'querystring';
import { AppConfigService } from 'src/config/config.service';
import {
  GoogleAdsAccount,
  GoogleAdsAdGroupAdStatus,
  GoogleAdsAdGroupCriterionStatus,
  GoogleAdsAdGroupStatus,
  GoogleAdsAdGroupType,
  GoogleAdsAdvertisingChannelType,
  GoogleAdsCampaignStatus,
  GoogleAdsResponseContentType,
} from './google-ads.enum';
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
} from './google-ads.types';
import {
  AddGeoTargetingToCampaignBody,
  AddKeywordsToAdGroupBody,
  CreateAdGroupAdBody,
  CreateAdGroupBody,
  CreateCampaignBody,
  GoogleAdsRequestOptions,
  UpdateCampaignBody,
} from './my-types';

@Injectable()
export class GoogleAdsApi {
  private oauth2Client: OAuth2Client;
  private GOOGLE_CLIENT_ID: string;
  private GOOGLE_CLIENT_SECRET: string;
  private GOOGLE_ADS_API_URL = 'https://googleads.googleapis.com';
  private GOOGLE_ADS_VERSION = 'v20';
  private GOOGLE_ADS_LOGIN_CUSTOMER_ID: string;
  private GOOGLE_ADS_DEVELOPER_TOKEN: string;
  private GOOGLE_ADS_REFRESH_TOKEN: string;
  private googleAdsAccessToken: string;
  private googleAdsAccessTokenExpiresAt: DateTime;
  private GOOGLE_ADS_US_CUSTOMER_ID: string;
  private GOOGLE_ADS_CA_CUSTOMER_ID: string;
  private DRY_RUN = false;

  constructor(private config: AppConfigService) {
    this.GOOGLE_CLIENT_ID = this.config.get('GOOGLE_CLIENT_ID');
    this.GOOGLE_CLIENT_SECRET = this.config.get('GOOGLE_CLIENT_SECRET');

    this.oauth2Client = new google.auth.OAuth2(
      this.GOOGLE_CLIENT_ID,
      this.GOOGLE_CLIENT_SECRET,
      `${this.config.get('API_URL')}/api/google/auth/redirect`,
    );

    this.GOOGLE_ADS_DEVELOPER_TOKEN = this.config.get(
      'GOOGLE_ADS_DEVELOPER_TOKEN',
    );
    this.GOOGLE_ADS_LOGIN_CUSTOMER_ID = this.config.get(
      'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
    );
    this.GOOGLE_ADS_REFRESH_TOKEN = this.config.get('GOOGLE_ADS_REFRESH_TOKEN');
    this.GOOGLE_ADS_US_CUSTOMER_ID = this.config.get(
      'GOOGLE_ADS_US_CUSTOMER_ID',
    );
    this.GOOGLE_ADS_CA_CUSTOMER_ID = this.config.get(
      'GOOGLE_ADS_CA_CUSTOMER_ID',
    );

    this.googleAdsAccessTokenExpiresAt = DateTime.now().minus({ days: 1 });
  }

  getGoogleAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/adwords',
      // 'https://www.googleapis.com/auth/userinfo.profile',
      // 'openid',
      // 'https://www.googleapis.com/auth/userinfo.email',
    ];

    // Generate a url that asks permissions for the Drive activity scope
    const authorizationUrl = this.oauth2Client.generateAuthUrl({
      // 'online' (default) or 'offline' (gets refresh_token)
      access_type: 'offline',
      /** Pass in the scopes array defined above.
       * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
      scope: scopes,
      // Enable incremental authorization. Recommended as a best practice.
      include_granted_scopes: true,
      state: 'state_parameter_passthrough_value',
      prompt: 'consent',
    });
    return authorizationUrl;
  }

  private async axiosInstance() {
    const accessToken = await this.getAccessToken();
    return axios.create({
      baseURL: `${this.GOOGLE_ADS_API_URL}/${this.GOOGLE_ADS_VERSION}`,
      headers: {
        'developer-token': this.GOOGLE_ADS_DEVELOPER_TOKEN,
        'login-customer-id': this.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  private async getAccessToken() {
    if (DateTime.now() > this.googleAdsAccessTokenExpiresAt) {
      const { access_token, expires_in } =
        await this.getAccessTokenFromRefreshToken(
          this.GOOGLE_ADS_REFRESH_TOKEN,
        );
      this.googleAdsAccessToken = access_token;
      this.googleAdsAccessTokenExpiresAt = DateTime.now().plus({
        seconds: expires_in - 10,
      });
      return access_token;
    } else {
      return this.googleAdsAccessToken;
    }
  }

  private extractCustomerIdFromResourceName(resourceName: string) {
    const parts = resourceName.split('/');
    return parts[1];
  }

  private extractResouceIdFromResourceName(resourceName: string) {
    const parts = resourceName.split('/');
    return parts[3];
  }

  private checkResourceAgainstAccount(
    account: GoogleAdsAccount,
    resourceName: string,
  ) {
    const customerId = this.getCustomerIdByAccount(account);
    const resourceCustomerId =
      this.extractCustomerIdFromResourceName(resourceName);
    if (customerId !== resourceCustomerId) {
      throw new BadRequestException(
        `Resource x account mismatch- account-${customerId}, resourceCustomerId-${resourceCustomerId} `,
      );
    }
    return customerId;
  }

  private getCustomerIdByAccount(account: GoogleAdsAccount) {
    if (account === GoogleAdsAccount.AMPLIFY_US) {
      return this.GOOGLE_ADS_US_CUSTOMER_ID;
    } else if (account === GoogleAdsAccount.AMPLIFY_CA) {
      return this.GOOGLE_ADS_CA_CUSTOMER_ID;
    } else {
      throw new InternalServerErrorException('Selected account not configured');
    }
  }

  async googleAuthCallbackHandler(params: any) {
    try {
      const { code }: any = params;

      // get tokens
      const tokens = await this.getOauthTokensWithCode(code as string);

      const { refresh_token } = tokens;

      return { refresh_token };
    } catch (error) {
      console.log('Error occurred:', error);
      throw new InternalServerErrorException();
    }
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

  async getOauthTokensWithCode(code: string) {
    try {
      const tokensData = await this.getGoogleAccessTokenCall({
        code,
        grantType: 'authorization_code',
      });
      return tokensData;
    } catch (err: any) {
      console.error('error getting tokens');
      throw err;
    }
  }

  private async getAccessTokenFromRefreshToken(refreshToken: string) {
    try {
      const tokensData = await this.getGoogleAccessTokenCall({
        refreshToken,
        grantType: 'refresh_token',
      });
      return tokensData;
    } catch (err: any) {
      console.error('error getting tokens');
      throw err;
    }
  }

  private async mutateResourceOperation<T>(
    resource: GoogleAdsResource,
    customerId: string,
    operations: GoogleAdsOperation<T>[],
    options?: GoogleAdsRequestOptions,
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
      console.error(`Cannot complete ${resource} mutate operation`);
      if (error instanceof AxiosError) {
        console.log(error.response?.data);
        console.log(JSON.stringify(error.response?.data || {}));
        console.log(error.response?.data?.error?.message);
      }
      throw error;
    }
  }

  private async campaignBudgetMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsBudget>[],
    options?: GoogleAdsRequestOptions,
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
    options?: GoogleAdsRequestOptions,
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
    options?: GoogleAdsRequestOptions,
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
    options?: GoogleAdsRequestOptions,
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
    options?: GoogleAdsRequestOptions,
  ) {
    const resource = 'adGroupCriteria';
    return await this.mutateResourceOperation<GoogleAdsAdGroupCriterion>(
      resource,
      customerId,
      operations,
      options,
    );
  }

  private async campaignCriteriaMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsCampaignCriterion>[],
    options?: GoogleAdsRequestOptions,
  ) {
    const resource = 'campaignCriteria';
    return await this.mutateResourceOperation<GoogleAdsCampaignCriterion>(
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
      console.error(`Cannot complete geoTargetConstants:suggest`);
      if (error instanceof AxiosError) {
        console.log(error.response?.data);
        console.log(JSON.stringify(error.response?.data || {}));
        console.log(error.response?.data?.error?.message);
      }
      throw error;
    }
  }

  async createBudget(
    account: GoogleAdsAccount,
    body: { name: string; amountMicros: number },
    options?: GoogleAdsRequestOptions,
  ) {
    try {
      const customerId = this.getCustomerIdByAccount(account);
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

  async createSearchCampaign(
    account: GoogleAdsAccount,
    body: CreateCampaignBody,
    options?: GoogleAdsRequestOptions,
  ) {
    try {
      const customerId = this.getCustomerIdByAccount(account);

      this.checkResourceAgainstAccount(account, body.campaignBudget);

      const campaign: Partial<GoogleAdsCampaign> = {
        name: body.name,
        status: GoogleAdsCampaignStatus.PAUSED,
        campaignBudget: body.campaignBudget,
        advertisingChannelType: GoogleAdsAdvertisingChannelType.SEARCH,
        startDate: body.startDate.toISOString(),
        endDate: body.endDate.toISOString(),
        tartgetRoas: {
          targetRoas: body.targetRoas.targetRoas,
          cpcBidCeilingMicros: body.targetRoas.cpcBidCeilingMicros.toString(),
          cpcBidFloorMicros: body.targetRoas.cpcBidFloorMicros.toString(),
        },
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
    options?: GoogleAdsRequestOptions,
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
    options?: GoogleAdsRequestOptions,
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
    options?: GoogleAdsRequestOptions,
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
    options?: GoogleAdsRequestOptions,
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
    options?: GoogleAdsRequestOptions,
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
}
