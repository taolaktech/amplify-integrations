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
  private DRY_RUN = true;

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
  ) {
    try {
      const url = `/customers/${customerId}/${resource}:mutate`;
      const axios = await this.axiosInstance();
      const data: GoogleAdsRestBody<T> = {
        operations,
        validateOnly: this.DRY_RUN || undefined,
      };
      const res = await axios.post<ResourceCreationResponse>(url, data);
      return res.data;
    } catch (error: unknown) {
      console.error(`Cannot complete ${resource} mutate operation`);
      console.log(error);
      if (error instanceof AxiosError) {
        console.log(error.response?.data);
        console.log(error.response?.data?.error?.message);
      }
      throw error;
    }
  }

  private async campaignBudgetMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsBudget>[],
  ) {
    const resource = 'campaignBudgets';

    return await this.mutateResourceOperation<GoogleAdsBudget>(
      resource,
      customerId,
      operations,
    );
  }

  private async campaignMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsCampaign>[],
  ) {
    const resource = 'campaigns';
    return await this.mutateResourceOperation<GoogleAdsCampaign>(
      resource,
      customerId,
      operations,
    );
  }

  private async adGroupsMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsAdGroup>[],
  ) {
    const resource = 'adGroups';
    return await this.mutateResourceOperation<GoogleAdsAdGroup>(
      resource,
      customerId,
      operations,
    );
  }

  private async adGroupsAdsMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsAdGroupAd>[],
  ) {
    const resource = 'adGroupAds';
    // customers/{customerId}/adGroupAds/{adGroupId}~{ad_id}
    return await this.mutateResourceOperation<GoogleAdsAdGroupAd>(
      resource,
      customerId,
      operations,
    );
  }

  private async adGroupCriteriaMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsAdGroupCriterion>[],
  ) {
    const resource = 'adGroupCriteria';
    return await this.mutateResourceOperation<GoogleAdsAdGroupCriterion>(
      resource,
      customerId,
      operations,
    );
  }

  private async campaignCriteriaMutateOperation(
    customerId: string,
    operations: GoogleAdsOperation<GoogleAdsCampaignCriterion>[],
  ) {
    const resource = 'campaignCriteria';
    return await this.mutateResourceOperation<GoogleAdsCampaignCriterion>(
      resource,
      customerId,
      operations,
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
      console.log(error);
      if (error instanceof AxiosError) {
        console.log(error.response?.data);
        console.log(error.response?.data?.error?.message);
      }
      throw error;
    }
  }

  async createBudget(
    account: GoogleAdsAccount,
    body: { name: string; amountMicros: number },
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
      );

      return { res, budget };
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
  ) {
    try {
      const customerId = this.getCustomerIdByAccount(account);

      this.checkResourceAgainstAccount(account, body.campaignBudget);

      const campaign: Partial<GoogleAdsCampaign> = {
        name: body.name,
        status: GoogleAdsCampaignStatus.PAUSED,
        campaignBudget: body.campaignBudget,
        advertisingChannelType: GoogleAdsAdvertisingChannelType.SEARCH,
        networkSettings: {
          targetGoogleSearch: true,
          targetSearchNetwork: true,
          targetContentNetwork: true,
          targetPartnerSearchNetwork: false,
        },
      };
      const operations = [{ create: campaign }];

      const res = await this.campaignMutateOperation(customerId, operations);

      const resourceName = res.results[0].resourceName;
      campaign.resourceName = resourceName;

      return { result: res.results[0], campaign };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot create search campaign');
    }
  }

  async createAdGroup(body: CreateAdGroupBody) {
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

      const res = await this.adGroupsMutateOperation(customerId, operations);

      const resourceName = res.results[0].resourceName;
      adGroup.resourceName = resourceName;

      return { result: res.results[0], adGroup };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot create adGroup');
    }
  }

  async createAdGroupAd(body: CreateAdGroupAdBody) {
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

      const res = await this.adGroupsAdsMutateOperation(customerId, operations);

      const resourceName = res.results[0].resourceName;
      adGroupAd.resourceName = resourceName;

      return { result: res.results[0], adGroupAd };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot create adGroupAd');
    }
  }

  async addKeywordsToAdGroup(body: AddKeywordsToAdGroupBody) {
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
      );

      // append resourceNames
      adGroupCriteria.forEach((criterion, index) => {
        criterion.resourceName = res.results[index].resourceName;
      });

      return { results: res.results, adGroupCriteria };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot add keywords');
    }
  }

  async addGeoTargetingToCampaign(body: AddGeoTargetingToCampaignBody) {
    try {
      const customerId = this.extractCustomerIdFromResourceName(
        body.campaignResourceName,
      );

      const gtc = {
        locale: body.locale ?? 'en', // defaults to en
        countryCode: 'COUNTRY_CODE',
        locationNames: {
          names: ['GEOLOCATION_1', 'GEO_LOCATION_2', 'GEO_LOCATION_2'],
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
      );

      campaignCriteria.forEach((criterion, index) => {
        criterion.resourceName = res.results[index].resourceName;
      });

      return { results: res.results, campaignCriteria };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Cannot add geo targeting');
    }
  }
}
