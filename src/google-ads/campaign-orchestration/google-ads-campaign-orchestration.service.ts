import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceNames } from 'src/common/types/service.types';
import {
  Business,
  CampaignDocument,
  GoogleAdsCampaignDoc,
} from 'src/database/schema';
import { GoogleAdsConnectionTokenService } from '../services/google-ads-connection-token.service';
import { GoogleAdsResourceApiService } from '../api/resource-api/resource.api';
import { GoogleAdsProcessingStatus } from 'src/enums';
import { GoogleAdsServedAssetFieldType } from '../api/resource-api/enums';
import { countryCodeMap } from './country-code-map';
import { GoogleAdsCampaignStatus } from '../api/resource-api/enums';

type CalculateTargetRoasResponse = {
  budget: number;
  AOV: number;
  targetRoas: {
    googleSearch?: number;
    [key: string]: number | undefined;
  };
  estimatedClicks: number;
  estimatedConversions: number;
  estimatedConversionValues: number;
};

@Injectable()
export class GoogleAdsCampaignOrchestrationService {
  private ONE_CURRENCY_UNIT = 1_000_000;
  private logger = new Logger(GoogleAdsCampaignOrchestrationService.name);

  constructor(
    @InjectModel('campaigns')
    private campaignModel: Model<CampaignDocument>,
    @InjectModel('business')
    private businessModel: Model<Business>,
    @InjectModel('google-ads-campaigns')
    private googleAdsCampaignModel: Model<GoogleAdsCampaignDoc>,
    private internalHttp: InternalHttpHelper,
    private googleAdsConnectionTokenService: GoogleAdsConnectionTokenService,
    private googleAdsResourceApi: GoogleAdsResourceApiService,
  ) {}

  private async markFailure(params: {
    googleAdsCampaignId: Types.ObjectId | unknown;
    previousStatus?: GoogleAdsProcessingStatus;
    error: unknown;
    campaignId: string;
  }) {
    const { googleAdsCampaignId, previousStatus, error, campaignId } = params;
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    this.logger.error(
      `Step failed for campaignId=${campaignId}: ${message} (previousStatus=${String(
        previousStatus,
      )})`,
    );
    if (stack) {
      this.logger.error(stack);
    }

    await this.googleAdsCampaignModel.updateOne(
      { _id: googleAdsCampaignId },
      {
        $set: {
          processingStatus: GoogleAdsProcessingStatus.FAILED,
          processingStatusBeforeFailure: previousStatus,
        },
      },
    );
  }

  /* Step 1-
    - Idempotently creates budget, target ROAS bidding strategy, and campaign for a given campaignId. 
    Persists state in google-ads-campaigns.
    */
  async step1(params: { campaignId: string }) {
    if (!params.campaignId) {
      throw new BadRequestException('campaignId is required');
    }

    this.logger.log(`Step1--> start campaignId=${params.campaignId}`);

    const campaignObjectId = new Types.ObjectId(params.campaignId);
    const campaign = await this.campaignModel.findById(campaignObjectId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    this.logger.log(
      `Step1--> loaded campaign _id=${campaign._id.toString()} businessId=${campaign.businessId?.toString?.()}`,
    );

    const business = await this.businessModel.findById(campaign.businessId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    this.logger.log(`Step1--> loaded business _id=${business._id.toString()}`);

    const connectionId =
      business?.integrations?.googleAds?.primaryAdAccountConnection;
    if (!connectionId) {
      throw new BadRequestException(
        'Business is missing integrations.googleAds.primaryAdAccountConnection',
      );
    }

    this.logger.log(
      `Step1--> current business primary connectionId=${connectionId.toString()}`,
    );

    const existingGoogleAdsCampaign = await this.googleAdsCampaignModel.findOne(
      {
        campaign: campaignObjectId,
      },
    );

    const googleAdsCampaign =
      existingGoogleAdsCampaign ||
      (await this.googleAdsCampaignModel.create({
        campaign: campaignObjectId,
        connectionId,
        processingStatus: GoogleAdsProcessingStatus.PENDING,
      }));

    this.logger.log(
      `Step1--> googleAdsCampaign _id=${googleAdsCampaign._id?.toString?.()} status=${String(
        googleAdsCampaign.processingStatus,
      )}`,
    );

    const lockedConnectionId = googleAdsCampaign.connectionId ?? connectionId;
    if (
      googleAdsCampaign.connectionId &&
      googleAdsCampaign.connectionId.toString() !== connectionId.toString()
    ) {
      this.logger.warn(
        `Business primary connection changed during orchestration. Using locked connectionId=${googleAdsCampaign.connectionId.toString()} instead of current=${connectionId.toString()} for campaignId=${params.campaignId}`,
      );
    }

    const previousStatus = googleAdsCampaign.processingStatus;

    try {
      // Persist stable customer context once so future steps don't depend on
      // connection.primaryCustomerAccount (which a user might change later).
      let customerId = googleAdsCampaign.googleAdsCustomerId;
      if (!customerId) {
        const connectionAuth =
          await this.googleAdsConnectionTokenService.getAuthContext({
            connectionId: lockedConnectionId.toString(),
          });
        customerId = connectionAuth.loginCustomerId;

        this.logger.log(
          `Step1--> persisting googleAdsCustomerId=${customerId} on googleAdsCampaign _id=${googleAdsCampaign._id?.toString?.()}`,
        );

        await this.googleAdsCampaignModel.updateOne(
          { _id: googleAdsCampaign._id },
          {
            $set: {
              googleAdsCustomerId: customerId,
              connectionId: lockedConnectionId,
            },
          },
        );
      }

      const options = {
        connectionId: lockedConnectionId.toString(),
        loginCustomerId: customerId,
      };

      this.logger.log(
        `Step1--> resolved customerId=${customerId} using connectionId=${lockedConnectionId.toString()}`,
      );

      const googleBudgetTotal =
        Number(campaign.totalBudget || 0) /
        Math.max(
          Array.isArray(campaign.platforms)
            ? Array.from(new Set(campaign.platforms)).length
            : 1,
          1,
        );

      this.logger.log(
        `Step1--> budget inputs totalBudget=${String(
          campaign.totalBudget,
        )} platforms=${Array.isArray(campaign.platforms) ? Array.from(new Set(campaign.platforms)).join(',') : 'N/A'} googleBudgetTotal=${googleBudgetTotal}`,
      );

      const startDate = campaign.startDate
        ? new Date(campaign.startDate)
        : new Date();
      const endDate = campaign.endDate ? new Date(campaign.endDate) : undefined;
      if (!endDate || isNaN(endDate.getTime())) {
        throw new BadRequestException('Campaign endDate is required');
      }
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException('Invalid campaign startDate');
      }
      if (endDate < startDate) {
        throw new BadRequestException('End date must be after start date');
      }

      const diffInMs = endDate.getTime() - startDate.getTime();
      const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24)) + 1;
      const dailyBudget = googleBudgetTotal / Math.max(days, 1);

      this.logger.log(
        `Step1--> date window start=${startDate.toISOString()} end=${endDate.toISOString()} days=${days} dailyBudget=${dailyBudget}`,
      );

      const budgetAmountMicros = Math.floor(
        dailyBudget * this.ONE_CURRENCY_UNIT,
      );

      const campaignName = `${campaign.name}_${campaign._id.toString()}`;

      this.logger.log(
        `Step1--> derived campaignName=${campaignName} budgetAmountMicros=${budgetAmountMicros}`,
      );

      if (!googleAdsCampaign.budgetResourceName) {
        this.logger.log(
          `Step1--> creating budget for campaignId=${params.campaignId}`,
        );

        await this.googleAdsCampaignModel.updateOne(
          { _id: googleAdsCampaign._id },
          {
            $set: {
              processingStatus: GoogleAdsProcessingStatus.CREATING_BUDGET,
              budgetAmountMicros,
            },
          },
        );

        const budgetRes = await this.googleAdsResourceApi.createBudget(
          customerId,
          {
            name: `${campaignName}_budget`,
            amountMicros: budgetAmountMicros,
          },
          options,
        );

        const budgetResourceName = budgetRes?.budget?.resourceName;
        this.logger.log(
          `Step1--> budget create response resourceName=${String(
            budgetResourceName,
          )}`,
        );
        if (!budgetResourceName) {
          throw new InternalServerErrorException(
            'Budget creation did not return resourceName',
          );
        }

        await this.googleAdsCampaignModel.updateOne(
          { _id: googleAdsCampaign._id },
          {
            $set: {
              budgetResourceName,
            },
          },
        );
      } else {
        this.logger.log(
          `Step1--> budget already created; skipping. campaignId=${params.campaignId}`,
        );
      }

      if (!googleAdsCampaign.biddingStrategyResourceName) {
        this.logger.log(
          `Step1--> creating bidding strategy for campaignId=${params.campaignId}`,
        );

        await this.googleAdsCampaignModel.updateOne(
          { _id: googleAdsCampaign._id },
          {
            $set: {
              processingStatus:
                GoogleAdsProcessingStatus.CREATING_BIDDING_STRATEGY,
            },
          },
        );

        this.logger.log(
          `Step1--> requesting target roas from amplify-manager businessId=${business._id.toString()} budget=${googleBudgetTotal}`,
        );
        const targetRoasRes = await this.internalHttp
          .forService(ServiceNames.AMPLIFY_MANAGER)
          .post<CalculateTargetRoasResponse>(
            `/internal/business/${business._id.toString()}/calculate-target-roas`,
            { budget: googleBudgetTotal },
          );

        const rawTargetRoas = targetRoasRes?.targetRoas?.googleSearch;
        const targetRoas = Math.min(Number(rawTargetRoas || 1), 1000);

        this.logger.log(
          `Step1--> target roas raw=${String(rawTargetRoas)} clamped=${targetRoas}`,
        );

        const cpcBidCeiling = Math.ceil((dailyBudget * 0.8) / 10);
        const cpcBidFloor = Math.ceil((dailyBudget * 0.2) / 10);

        this.logger.log(
          `Step1--> bid ranges cpcBidCeiling=${cpcBidCeiling} cpcBidFloor=${cpcBidFloor}`,
        );

        const biddingStrategyRes =
          await this.googleAdsResourceApi.createTargetRoasBiddingStrategy(
            customerId,
            {
              name: `${campaignName}_bidding_strategy`,
              targetRoas,
              cpcBidCeilingMicros: Math.floor(
                cpcBidCeiling * this.ONE_CURRENCY_UNIT,
              ),
              cpcBidFloorMicros: Math.floor(
                cpcBidFloor * this.ONE_CURRENCY_UNIT,
              ),
            },
            options,
          );

        const biddingStrategyResourceName =
          biddingStrategyRes?.biddingStrategy?.resourceName;
        this.logger.log(
          `Step1--> bidding strategy create response resourceName=${String(
            biddingStrategyResourceName,
          )}`,
        );
        if (!biddingStrategyResourceName) {
          throw new InternalServerErrorException(
            'Bidding strategy creation did not return resourceName',
          );
        }

        await this.googleAdsCampaignModel.updateOne(
          { _id: googleAdsCampaign._id },
          {
            $set: {
              biddingStrategyResourceName,
              biddingStrategyType: 'TARGET_ROAS',
            },
          },
        );
      } else {
        this.logger.log(
          `Step1--> bidding strategy already created; skipping. campaignId=${params.campaignId}`,
        );
      }

      const refreshed = await this.googleAdsCampaignModel.findById(
        googleAdsCampaign._id,
      );
      if (!refreshed) {
        throw new InternalServerErrorException(
          'Google Ads campaign record missing',
        );
      }

      if (!refreshed.campaignResourceName) {
        this.logger.log(
          `Step1--> creating campaign for campaignId=${params.campaignId}`,
        );

        this.logger.log(
          `Step1--> create campaign inputs budgetResourceName=${refreshed.budgetResourceName} biddingStrategyResourceName=${refreshed.biddingStrategyResourceName}`,
        );

        await this.googleAdsCampaignModel.updateOne(
          { _id: refreshed._id },
          {
            $set: {
              processingStatus: GoogleAdsProcessingStatus.CREATING_CAMPAIGN,
            },
          },
        );

        const createCampaignRes =
          await this.googleAdsResourceApi.createSearchCampaign(
            customerId,
            {
              name: campaignName,
              campaignBudget: refreshed.budgetResourceName,
              biddingStrategy: refreshed.biddingStrategyResourceName,
              startDate,
              endDate,
            },
            options,
          );

        const campaignResourceName = createCampaignRes?.campaign?.resourceName;
        this.logger.log(
          `Step1--> campaign create response resourceName=${String(
            campaignResourceName,
          )}`,
        );
        if (!campaignResourceName) {
          throw new InternalServerErrorException(
            'Campaign creation did not return resourceName',
          );
        }

        await this.googleAdsCampaignModel.updateOne(
          { _id: refreshed._id },
          {
            $set: {
              campaignResourceName,
              campaignName,
              campaignType: String(campaign.type),
              campaignStatus: 'PAUSED',
              processingStatus: GoogleAdsProcessingStatus.CREATING_AD_GROUPS,
            },
          },
        );
      } else {
        this.logger.log(
          `Step1--> campaign already created; skipping. campaignId=${params.campaignId}`,
        );
      }

      const result = await this.googleAdsCampaignModel.findById(
        googleAdsCampaign._id,
      );

      this.logger.log(`Step1--> done campaignId=${params.campaignId}`);

      // NOTE: We keep the connection locked after step1, since follow-up steps
      // use the stored connectionId/googleAdsCustomerId for stable context.

      return result;
    } catch (error) {
      await this.markFailure({
        googleAdsCampaignId: googleAdsCampaign._id,
        previousStatus,
        error,
        campaignId: params.campaignId,
      });

      throw error;
    }
  }

  /* Step 2-
    - Idempotently creates ad group and ads for a given campaignId. 
    Persists state in google-ads-campaigns.
    */
  async step2(params: { campaignId: string }) {
    if (!params.campaignId) {
      throw new BadRequestException('campaignId is required');
    }

    this.logger.log(`Step2--> start campaignId=${params.campaignId}`);

    const campaignObjectId = new Types.ObjectId(params.campaignId);
    const campaign = await this.campaignModel.findById(campaignObjectId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const googleAdsCampaign = await this.googleAdsCampaignModel.findOne({
      campaign: campaignObjectId,
    });
    if (!googleAdsCampaign) {
      throw new NotFoundException(
        'Google Ads campaign record not found (run step-1 first)',
      );
    }

    if (!googleAdsCampaign.connectionId) {
      throw new BadRequestException(
        'Google Ads campaign record missing connectionId (run step-1 first)',
      );
    }
    if (!googleAdsCampaign.googleAdsCustomerId) {
      throw new BadRequestException(
        'Google Ads campaign record missing googleAdsCustomerId (run step-1 first)',
      );
    }
    if (!googleAdsCampaign.campaignResourceName) {
      throw new BadRequestException(
        'Google Ads campaign record missing campaignResourceName (run step-1 first)',
      );
    }

    const options = {
      connectionId: googleAdsCampaign.connectionId.toString(),
      loginCustomerId: googleAdsCampaign.googleAdsCustomerId,
    };

    const previousStatus = googleAdsCampaign.processingStatus;

    try {
      const existingAdGroup = googleAdsCampaign.adGroups?.[0];

      let adGroupResourceName: string | undefined =
        existingAdGroup?.resourceName;
      let adGroupName: string | undefined = existingAdGroup?.name;

      if (!adGroupResourceName) {
        adGroupName = `${campaign.name}_${campaign._id.toString()}_adgroup`
          .replace(/\s+/g, '_')
          .slice(0, 255);

        this.logger.log(
          `Step2--> creating single ad group name=${adGroupName} for campaignResourceName=${googleAdsCampaign.campaignResourceName}`,
        );

        await this.googleAdsCampaignModel.updateOne(
          { _id: googleAdsCampaign._id },
          {
            $set: {
              processingStatus: GoogleAdsProcessingStatus.CREATING_AD_GROUPS,
            },
          },
        );

        const adGroupRes = await this.googleAdsResourceApi.createAdGroup(
          {
            adGroupName,
            campaignResourceName: googleAdsCampaign.campaignResourceName,
          },
          options,
        );

        adGroupResourceName = adGroupRes?.adGroup?.resourceName;
        if (!adGroupResourceName) {
          throw new InternalServerErrorException(
            'Ad group creation did not return resourceName',
          );
        }

        await this.googleAdsCampaignModel.updateOne(
          { _id: googleAdsCampaign._id },
          {
            $set: {
              adGroups: [
                {
                  resourceName: adGroupResourceName,
                  name: adGroupName || 'adgroup',
                  status: 'ENABLED',
                  type: 'SEARCH_STANDARD',
                  // productId: 'ALL',
                  ads: [],
                },
              ],
              processingStatus: GoogleAdsProcessingStatus.AD_GROUPS_CREATED,
            },
          },
        );

        this.logger.log(
          `Step2--> ad group created resourceName=${adGroupResourceName}`,
        );
      } else {
        this.logger.log(
          `Step2--> ad group already exists; skipping. resourceName=${adGroupResourceName}`,
        );
      }

      const refreshed = await this.googleAdsCampaignModel.findById(
        googleAdsCampaign._id,
      );
      if (!refreshed) {
        throw new InternalServerErrorException(
          'Google Ads campaign record missing',
        );
      }

      const refreshedAdGroup = refreshed.adGroups?.[0];
      if (!refreshedAdGroup?.resourceName) {
        throw new InternalServerErrorException(
          'Google Ads campaign record missing adGroup resourceName',
        );
      }

      const existingAds = refreshedAdGroup.ads || [];

      const headlines: string[] = [];
      const descriptions: string[] = [];
      const finalUrls: string[] = [];

      for (const product of campaign.products || []) {
        if (product?.productLink) {
          finalUrls.push(product.productLink);
        }
        for (const creative of product.creatives || []) {
          if (creative.channel !== 'google') continue;
          for (const d of creative.data || []) {
            try {
              const datum = JSON.parse(d);
              if (datum?.headline) {
                headlines.push(String(datum.headline).slice(0, 30));
              }
              if (datum?.description) {
                descriptions.push(String(datum.description).slice(0, 90));
              }
            } catch {
              continue;
            }
          }
        }
      }

      const uniqFinalUrls = Array.from(new Set(finalUrls)).filter(Boolean);

      if (uniqFinalUrls.length < 1) {
        throw new BadRequestException('No finalUrls found for ad creation');
      }
      if (headlines.length < 3) {
        throw new BadRequestException(
          `Not enough headlines for ad creation (need >=3, got ${headlines.length})`,
        );
      }
      if (descriptions.length < 3) {
        throw new BadRequestException(
          `Not enough descriptions for ad creation (need >=3, got ${descriptions.length})`,
        );
      }

      const adsToCreate: {
        name: string;
        headlines: string[];
        descriptions: string[];
      }[] = [];

      const maxAds = Math.min(
        Math.floor(headlines.length / 3),
        Math.floor(descriptions.length / 3),
      );

      for (let i = 0; i < maxAds; i++) {
        adsToCreate.push({
          name: `${refreshedAdGroup.name || 'adgroup'}_ad_${i + 1}`.slice(
            0,
            255,
          ),
          headlines: headlines.slice(i * 3, i * 3 + 3),
          descriptions: descriptions.slice(i * 3, i * 3 + 3),
        });
      }

      const existingNames = new Set(existingAds.map((a) => a.name));
      const pendingAds = adsToCreate.filter((a) => !existingNames.has(a.name));

      if (!pendingAds.length) {
        this.logger.log(
          `Step2--> ad group ads already created; skipping. campaignId=${params.campaignId}`,
        );
        await this.googleAdsCampaignModel.updateOne(
          { _id: refreshed._id },
          {
            $set: {
              processingStatus: GoogleAdsProcessingStatus.AD_GROUP_ADS_CREATED,
            },
          },
        );

        return await this.googleAdsCampaignModel.findById(refreshed._id);
      }

      this.logger.log(
        `Step2--> creating ${pendingAds.length} ad group ads in single ad group`,
      );

      await this.googleAdsCampaignModel.updateOne(
        { _id: refreshed._id },
        {
          $set: {
            processingStatus: GoogleAdsProcessingStatus.CREATING_AD_GROUP_ADS,
          },
        },
      );

      const createdAds: {
        resourceName: string;
        name: string;
        status?: string;
      }[] = [];

      for (const ad of pendingAds) {
        const headlineAssets = ad.headlines.map((text, idx) => {
          if (idx === 0) {
            return {
              text,
              pinnedField: GoogleAdsServedAssetFieldType.HEADLINE_1,
            };
          }
          if (idx === 1) {
            return {
              text,
              pinnedField: GoogleAdsServedAssetFieldType.HEADLINE_2,
            };
          }
          return { text };
        });

        const descriptionAssets = ad.descriptions.map((text, idx) => {
          if (idx === 0) {
            return {
              text,
              pinnedField: GoogleAdsServedAssetFieldType.DESCRIPTION_1,
            };
          }
          if (idx === 1) {
            return {
              text,
              pinnedField: GoogleAdsServedAssetFieldType.DESCRIPTION_2,
            };
          }
          return { text };
        });

        this.logger.log(`Step2--> creating adGroupAd name=${ad.name}`);

        const adRes = await this.googleAdsResourceApi.createAdGroupAd(
          {
            adGroupAdName: ad.name,
            adGroupResourceName: refreshedAdGroup.resourceName,
            finalUrls: uniqFinalUrls,
            headlines: headlineAssets,
            descriptions: descriptionAssets,
          },
          options,
        );

        const adResourceName = adRes?.adGroupAd?.resourceName;
        if (adResourceName) {
          createdAds.push({
            resourceName: adResourceName,
            name: ad.name,
            status: 'ENABLED',
          });
        }
      }

      if (createdAds.length) {
        await this.googleAdsCampaignModel.updateOne(
          { _id: refreshed._id },
          {
            $push: {
              'adGroups.0.ads': {
                $each: createdAds,
              },
            },
          },
        );
      }

      await this.googleAdsCampaignModel.updateOne(
        { _id: refreshed._id },
        {
          $set: {
            processingStatus: GoogleAdsProcessingStatus.AD_GROUP_ADS_CREATED,
          },
        },
      );

      this.logger.log(`Step2--> done campaignId=${params.campaignId}`);
      return await this.googleAdsCampaignModel.findById(refreshed._id);
    } catch (error) {
      await this.markFailure({
        googleAdsCampaignId: googleAdsCampaign._id,
        previousStatus,
        error,
        campaignId: params.campaignId,
      });
      throw error;
    }
  }

  /* Step 3-
    - Idempotently adds geo targeting to the Google Ads campaign based on Campaign.location. 
    Uses state persisted in google-ads-campaigns by step 1.
    */
  async step3(params: { campaignId: string }) {
    if (!params.campaignId) {
      throw new BadRequestException('campaignId is required');
    }

    this.logger.log(`Step3--> start campaignId=${params.campaignId}`);

    const campaignObjectId = new Types.ObjectId(params.campaignId);
    const campaign = await this.campaignModel.findById(campaignObjectId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const googleAdsCampaign = await this.googleAdsCampaignModel.findOne({
      campaign: campaignObjectId,
    });
    if (!googleAdsCampaign) {
      throw new NotFoundException(
        'Google Ads campaign record not found (run step-1 first)',
      );
    }

    if (!googleAdsCampaign.connectionId) {
      throw new BadRequestException(
        'Google Ads campaign record missing connectionId (run step-1 first)',
      );
    }
    if (!googleAdsCampaign.googleAdsCustomerId) {
      throw new BadRequestException(
        'Google Ads campaign record missing googleAdsCustomerId (run step-1 first)',
      );
    }
    if (!googleAdsCampaign.campaignResourceName) {
      throw new BadRequestException(
        'Google Ads campaign record missing campaignResourceName (run step-1 first)',
      );
    }

    const options = {
      connectionId: googleAdsCampaign.connectionId.toString(),
      loginCustomerId: googleAdsCampaign.googleAdsCustomerId,
    };

    const previousStatus = googleAdsCampaign.processingStatus;

    try {
      if (googleAdsCampaign.geotargetingAddedToCampaign) {
        this.logger.log(
          `Step3--> geo targeting already added; skipping. campaignId=${params.campaignId}`,
        );
        return await this.googleAdsCampaignModel.findById(
          googleAdsCampaign._id,
        );
      }

      const locationRows = Array.isArray(campaign.location)
        ? campaign.location
        : [];

      if (!locationRows.length) {
        throw new BadRequestException('Campaign location is required');
      }

      const locationsByCountry = locationRows.reduce(
        (acc, loc) => {
          const rawCountry = String(loc?.country || '').trim();

          if (!rawCountry) {
            return acc;
          }

          const upper = rawCountry.toUpperCase();
          if (upper.length !== 2 && upper.length !== 3) {
            this.logger.warn(
              `Step3--> skipping location because country code is not ISO-2 or ISO-3: country=${rawCountry}`,
            );
            return acc;
          }

          if (upper.length === 3 && !countryCodeMap[upper]) {
            this.logger.warn(
              `Step3--> skipping location because ISO-3 country is unmapped: country=${rawCountry}`,
            );
            return acc;
          }

          const country = upper.length === 3 ? countryCodeMap[upper] : upper;

          const values: string[] = [];
          if (loc?.state) values.push(String(loc.state));
          if (loc?.city) values.push(String(loc.city));

          if (!values.length) {
            return acc;
          }

          if (acc[country]) {
            acc[country].push(...values);
          } else {
            acc[country] = [...values];
          }

          return acc;
        },
        {} as Record<string, string[]>,
      );

      const countries = Object.keys(locationsByCountry);
      if (!countries.length) {
        throw new BadRequestException(
          'No valid geo targeting locations found (expecting ISO-2 country codes)',
        );
      }

      await this.googleAdsCampaignModel.updateOne(
        { _id: googleAdsCampaign._id },
        {
          $set: {
            processingStatus: GoogleAdsProcessingStatus.ADDING_GEO_TARGETING,
          },
        },
      );

      for (const countryCode of countries) {
        const uniqLocationNames = Array.from(
          new Set(locationsByCountry[countryCode].filter(Boolean)),
        );
        if (!uniqLocationNames.length) {
          continue;
        }

        this.logger.log(
          `Step3--> adding geo targeting country=${countryCode} locations=${uniqLocationNames.join(',')}`,
        );

        await this.googleAdsResourceApi.addGeoTargetingToCampaign(
          {
            campaignResourceName: googleAdsCampaign.campaignResourceName,
            locale: 'en',
            countryCode,
            locationNames: uniqLocationNames,
          },
          options,
        );
      }

      await this.googleAdsCampaignModel.updateOne(
        { _id: googleAdsCampaign._id },
        {
          $set: {
            geotargetingAddedToCampaign: true,
            processingStatus: GoogleAdsProcessingStatus.ADDING_GEO_TARGETING,
          },
        },
      );

      this.logger.log(`Step3--> done campaignId=${params.campaignId}`);
      return await this.googleAdsCampaignModel.findById(googleAdsCampaign._id);
    } catch (error) {
      await this.markFailure({
        googleAdsCampaignId: googleAdsCampaign._id,
        previousStatus,
        error,
        campaignId: params.campaignId,
      });
      throw error;
    }
  }

  async step4(params: { campaignId: string }) {
    if (!params.campaignId) {
      throw new BadRequestException('campaignId is required');
    }

    this.logger.log(`Step4--> start campaignId=${params.campaignId}`);

    const campaignObjectId = new Types.ObjectId(params.campaignId);
    const campaign = await this.campaignModel.findById(campaignObjectId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const googleAdsCampaign = await this.googleAdsCampaignModel.findOne({
      campaign: campaignObjectId,
    });
    if (!googleAdsCampaign) {
      throw new NotFoundException(
        'Google Ads campaign record not found (run step-1 first)',
      );
    }

    if (!googleAdsCampaign.connectionId) {
      throw new BadRequestException(
        'Google Ads campaign record missing connectionId (run step-1 first)',
      );
    }
    if (!googleAdsCampaign.googleAdsCustomerId) {
      throw new BadRequestException(
        'Google Ads campaign record missing googleAdsCustomerId (run step-1 first)',
      );
    }
    if (!googleAdsCampaign.campaignResourceName) {
      throw new BadRequestException(
        'Google Ads campaign record missing campaignResourceName (run step-1 first)',
      );
    }

    const options = {
      connectionId: googleAdsCampaign.connectionId.toString(),
      loginCustomerId: googleAdsCampaign.googleAdsCustomerId,
    };

    const previousStatus = googleAdsCampaign.processingStatus;

    try {
      if (
        googleAdsCampaign.processingStatus ===
          GoogleAdsProcessingStatus.LAUNCHED ||
        googleAdsCampaign.campaignStatus === GoogleAdsCampaignStatus.ENABLED
      ) {
        this.logger.log(
          `Step4--> campaign already enabled; skipping. campaignId=${params.campaignId}`,
        );
        return await this.googleAdsCampaignModel.findById(
          googleAdsCampaign._id,
        );
      }

      await this.googleAdsCampaignModel.updateOne(
        { _id: googleAdsCampaign._id },
        {
          $set: {
            processingStatus: GoogleAdsProcessingStatus.LAUNCHING,
          },
        },
      );

      this.logger.log(
        `Step4--> enabling campaignResourceName=${googleAdsCampaign.campaignResourceName}`,
      );

      await this.googleAdsResourceApi.updateCampaign(
        {
          updateMask: 'status',
          campaign: {
            resourceName: googleAdsCampaign.campaignResourceName,
            status: GoogleAdsCampaignStatus.ENABLED,
          },
        },
        options,
      );

      await this.googleAdsCampaignModel.updateOne(
        { _id: googleAdsCampaign._id },
        {
          $set: {
            campaignStatus: GoogleAdsCampaignStatus.ENABLED,
            processingStatus: GoogleAdsProcessingStatus.LAUNCHED,
          },
        },
      );

      this.logger.log(`Step4--> done campaignId=${params.campaignId}`);
      return await this.googleAdsCampaignModel.findById(googleAdsCampaign._id);
    } catch (error) {
      await this.markFailure({
        googleAdsCampaignId: googleAdsCampaign._id,
        previousStatus,
        error,
        campaignId: params.campaignId,
      });
      throw error;
    }
  }
}
