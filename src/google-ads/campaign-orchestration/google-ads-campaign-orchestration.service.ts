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
  BusinessDoc,
  CampaignDocument,
  GoogleAdsCampaignDoc,
  GoogleAdsConversionActionDoc,
} from 'src/database/schema';
import { GoogleAdsAccountDoc } from 'src/database/schema/google-ads-account.schema';
import { GoogleAdsConnectionTokenService } from '../services/google-ads-connection-token.service';
import { GoogleAdsResourceApiService } from '../api/resource-api/resource.api';
import { GoogleAdsProcessingStatus } from 'src/enums';
import { GoogleAdsServedAssetFieldType } from '../api/resource-api/enums';
import { countryCodeMap } from './country-code-map';
import { GoogleAdsCampaignStatus } from '../api/resource-api/enums';
import { GoogleAdsSearchApiService } from '../api/search-api/search-api';
import { GoogleAdsCustomerApiService } from '../api/customer-api/customer.api';
import { GoogleAdsKeywordMatchType } from '../api/resource-api/enums';

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
  private MIN_CURRENCY_UNIT_MICROS = 10_000;
  private logger = new Logger(GoogleAdsCampaignOrchestrationService.name);

  constructor(
    @InjectModel('campaigns')
    private campaignModel: Model<CampaignDocument>,
    @InjectModel('business')
    private businessModel: Model<Business>,
    @InjectModel('google-ads-accounts')
    private googleAdsAccountModel: Model<GoogleAdsAccountDoc>,
    @InjectModel('google-ads-campaigns')
    private googleAdsCampaignModel: Model<GoogleAdsCampaignDoc>,
    @InjectModel('google-ads-conversion-actions')
    private googleAdsConversionActionModel: Model<GoogleAdsConversionActionDoc>,
    private internalHttp: InternalHttpHelper,
    private googleAdsConnectionTokenService: GoogleAdsConnectionTokenService,
    private googleAdsResourceApi: GoogleAdsResourceApiService,
    private googleAdsSearchApi: GoogleAdsSearchApiService,
    private googleAdsCustomerApi: GoogleAdsCustomerApiService,
  ) {}

  private roundToMinCurrencyUnitMicros(amountMicros: number) {
    const unit = this.MIN_CURRENCY_UNIT_MICROS;
    const raw = Math.floor(Number(amountMicros || 0));
    if (!isFinite(raw) || raw <= 0) {
      return unit;
    }

    return Math.max(Math.ceil(raw / unit) * unit, unit);
  }

  private distributeKeywordsAcrossAdGroups(params: {
    keywordTexts: string[];
    adGroupCount: number;
  }) {
    const { keywordTexts, adGroupCount } = params;
    const assignments: string[][] = Array.from(
      { length: adGroupCount },
      () => [],
    );

    keywordTexts.forEach((keyword, index) => {
      const groupIndex = index % adGroupCount;
      assignments[groupIndex].push(keyword);
    });

    return assignments;
  }

  private normalizeCustomerId(value: string) {
    const raw = String(value || '').trim();
    const match = raw.match(/^customers\/(\d+)$/i);
    return match ? match[1] : raw;
  }

  private extractResourceIdFromResourceName(resourceName: string) {
    const parts = String(resourceName || '').split('/');
    return parts[parts.length - 1];
  }

  private extractConversionIdAndLabelFromEventSnippet(eventSnippet?: string) {
    if (!eventSnippet) {
      return { conversionTag: undefined, label: undefined };
    }
    const match = eventSnippet.match(/"send_to":\s*\[\s*"AW-(\d+)\/([\w-]+)"/);
    if (!match) {
      return { conversionTag: undefined, label: undefined };
    }
    return { conversionTag: `AW-${match[1]}`, label: match[2] };
  }

  private async ensureConversionActionForConnection(params: {
    connectionId: string;
    customerId: string;
    business: BusinessDoc;
    options: { connectionId: string; loginCustomerId: string };
  }) {
    const { connectionId, customerId, business, options } = params;

    const connectionObjectId = new Types.ObjectId(connectionId);
    const connection =
      await this.googleAdsAccountModel.findById(connectionObjectId);
    if (!connection) {
      throw new NotFoundException('Google Ads connection not found');
    }

    const sanitizedCustomerId = this.normalizeCustomerId(customerId);

    const existingConversionAction =
      await this.googleAdsConversionActionModel.findOne({
        userId: connection.userId,
        googleCustomerId: sanitizedCustomerId,
      });

    if (
      existingConversionAction?.conversionActionResourceName &&
      existingConversionAction?.conversionActionId &&
      Array.isArray(existingConversionAction?.conversionActionTagSnippets) &&
      existingConversionAction.conversionActionTagSnippets.length
    ) {
      return;
    }

    const customerName = `${String(business.companyName || 'business')}-${business._id.toString()}`;
    const conversionActionName = `${customerName}-conversion-action`;

    let conversionActionResourceName =
      existingConversionAction?.conversionActionResourceName;
    let conversionActionId = existingConversionAction?.conversionActionId;

    if (!conversionActionResourceName || !conversionActionId) {
      this.logger.log(
        `Step1--> creating conversion action for connectionId=${connectionId} customerId=${sanitizedCustomerId}`,
      );

      const createRes = await this.googleAdsResourceApi.createConversionAction(
        {
          customerId: sanitizedCustomerId,
          name: conversionActionName,
        },
        options,
      );

      conversionActionResourceName =
        createRes?.conversionAction?.resourceName || undefined;
      if (!conversionActionResourceName) {
        throw new InternalServerErrorException(
          'Conversion action creation did not return resourceName',
        );
      }
      conversionActionId = this.extractResourceIdFromResourceName(
        conversionActionResourceName,
      );
    }

    const details = await this.googleAdsSearchApi.getConversionActionById(
      sanitizedCustomerId,
      conversionActionId,
      { connectionId },
    );

    const tagSnippets = (details as any)?.results?.[0]?.conversionAction
      ?.tagSnippets;
    const eventSnippet = tagSnippets?.[0]?.eventSnippet;
    const { conversionTag, label } =
      this.extractConversionIdAndLabelFromEventSnippet(eventSnippet);

    await this.googleAdsConversionActionModel.updateOne(
      {
        userId: connection.userId,
        googleCustomerId: sanitizedCustomerId,
      },
      {
        $set: {
          conversionActionResourceName,
          conversionActionId,
          conversionActionTag: conversionTag,
          conversionActionLabel: label,
          conversionActionTagSnippets: Array.isArray(tagSnippets)
            ? tagSnippets
            : [],
        },
      },
      { upsert: true },
    );
  }

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
    -  creates budget, target ROAS bidding strategy, and campaign for a given campaignId. 
    Persists state in google-ads-campaigns.
    */
  async step1(params: { campaignId: string }) {
    if (!params.campaignId) {
      throw new BadRequestException('campaignId is required');
    }

    this.logger.log(
      `Step1(Creating budget, target ROAS bidding strategy, and campaign)--> start campaignId=${params.campaignId}`,
    );

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

      await this.ensureConversionActionForConnection({
        connectionId: lockedConnectionId.toString(),
        customerId,
        business,
        options,
      });

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
        `Step1--> BUDGET days=${days} dailyBudget=${dailyBudget}`,
      );

      this.logger.log(
        `Step1--> date window start=${startDate.toISOString().split('T')[0]} end=${endDate.toISOString().split('T')[0]} days=${days} dailyBudget=${dailyBudget}`,
      );

      const rawBudgetAmountMicros = Math.floor(
        dailyBudget * this.ONE_CURRENCY_UNIT,
      );
      const budgetAmountMicros = this.roundToMinCurrencyUnitMicros(
        rawBudgetAmountMicros,
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
    -  creates ad group and ads for a given campaignId. 
    Persists state in google-ads-campaigns.
    */
  async step2(params: { campaignId: string }) {
    if (!params.campaignId) {
      throw new BadRequestException('campaignId is required');
    }

    this.logger.log(
      `Step2(Creating ad groups and ads)--> start campaignId=${params.campaignId}`,
    );

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
      if (!Array.isArray(campaign.products) || !campaign.products.length) {
        throw new BadRequestException('Campaign has no products');
      }

      await this.googleAdsCampaignModel.updateOne(
        { _id: googleAdsCampaign._id },
        {
          $set: {
            processingStatus: GoogleAdsProcessingStatus.CREATING_AD_GROUPS,
          },
        },
      );

      for (const product of campaign.products) {
        const productId = String(product.shopifyId);

        const current = await this.googleAdsCampaignModel.findById(
          googleAdsCampaign._id,
        );
        if (!current) {
          throw new InternalServerErrorException(
            'Google Ads campaign record missing',
          );
        }

        const existingProductAdGroup = (current.adGroups || []).find(
          (g) => String(g.productId) === productId,
        );

        let adGroupResourceName = existingProductAdGroup?.resourceName;
        let adGroupName = existingProductAdGroup?.name;

        if (!adGroupResourceName) {
          adGroupName = `${product.title || campaign.name}_${productId}`
            .replace(/\s+/g, '_')
            .slice(0, 255);

          this.logger.log(
            `Step2--> creating ad group for productId=${productId} name=${adGroupName}`,
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
            {
              _id: googleAdsCampaign._id,
              'adGroups.productId': { $ne: productId },
            },
            {
              $push: {
                adGroups: {
                  resourceName: adGroupResourceName,
                  name: adGroupName || 'adgroup',
                  productId,
                  status: 'ENABLED',
                  type: 'SEARCH_STANDARD',
                  ads: [],
                },
              },
            },
          );
        } else {
          this.logger.log(
            `Step2--> ad group already exists for productId=${productId}; skipping creation. resourceName=${adGroupResourceName}`,
          );
        }

        const refreshed = await this.googleAdsCampaignModel.findById(
          googleAdsCampaign._id,
        );
        const refreshedProductAdGroup = (refreshed?.adGroups || []).find(
          (g) => String(g.productId) === productId,
        );
        if (!refreshedProductAdGroup?.resourceName) {
          throw new InternalServerErrorException(
            'Google Ads campaign record missing adGroup resourceName',
          );
        }

        if (
          Array.isArray(refreshedProductAdGroup.ads) &&
          refreshedProductAdGroup.ads.length
        ) {
          this.logger.log(
            `Step2--> ad already exists for productId=${productId}; skipping ad creation`,
          );
          continue;
        }

        const finalUrl = product.productLink;
        if (!finalUrl) {
          throw new BadRequestException(
            `Product ${productId} missing productLink`,
          );
        }

        const headlines: string[] = [];
        const descriptions: string[] = [];

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

        const uniqHeadlines = Array.from(new Set(headlines))
          .filter(Boolean)
          .slice(0, 15);
        const uniqDescriptions = Array.from(new Set(descriptions))
          .filter(Boolean)
          .slice(0, 4);

        if (uniqHeadlines.length < 3) {
          throw new BadRequestException(
            `Not enough headlines for productId=${productId} (need >=3, got ${uniqHeadlines.length})`,
          );
        }
        if (uniqDescriptions.length < 2) {
          throw new BadRequestException(
            `Not enough descriptions for productId=${productId} (need >=2, got ${uniqDescriptions.length})`,
          );
        }

        const headlineAssets = uniqHeadlines.map((text, idx) => {
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

        const descriptionAssets = uniqDescriptions.map((text, idx) => {
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

        const adName =
          `${refreshedProductAdGroup.name || 'adgroup'}_ad_1`.slice(0, 255);

        this.logger.log(
          `Step2--> creating adGroupAd for productId=${productId} name=${adName}`,
        );

        await this.googleAdsCampaignModel.updateOne(
          { _id: googleAdsCampaign._id },
          {
            $set: {
              processingStatus: GoogleAdsProcessingStatus.CREATING_AD_GROUP_ADS,
            },
          },
        );

        const adRes = await this.googleAdsResourceApi.createAdGroupAd(
          {
            adGroupAdName: adName,
            adGroupResourceName: refreshedProductAdGroup.resourceName,
            finalUrls: [finalUrl],
            headlines: headlineAssets,
            descriptions: descriptionAssets,
          },
          options,
        );

        const adResourceName = adRes?.adGroupAd?.resourceName;
        if (!adResourceName) {
          throw new InternalServerErrorException(
            'Ad group ad creation did not return resourceName',
          );
        }

        const createdAd = {
          resourceName: adResourceName,
          name: adName,
          status: 'ENABLED',
        };

        await this.googleAdsCampaignModel.updateOne(
          { _id: googleAdsCampaign._id, 'adGroups.productId': productId },
          {
            $addToSet: {
              'adGroups.$.ads': createdAd,
            },
          },
        );
      }

      await this.googleAdsCampaignModel.updateOne(
        { _id: googleAdsCampaign._id },
        {
          $set: {
            processingStatus: GoogleAdsProcessingStatus.AD_GROUP_ADS_CREATED,
          },
        },
      );

      this.logger.log(`Step2--> done campaignId=${params.campaignId}`);
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

  /* Step 3-
    -  generates keyword ideas and adds them to all ad groups.
    Uses state persisted in google-ads-campaigns by steps 1 & 2.
    */
  async step3(params: { campaignId: string }) {
    if (!params.campaignId) {
      throw new BadRequestException('campaignId is required');
    }

    this.logger.log(
      `Step3(Adding keywords to ad groups)--> start campaignId=${params.campaignId}`,
    );

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

    if (googleAdsCampaign.keywordsAddedToAdGroups) {
      this.logger.log(
        `Step3--> keywords already added; skipping. campaignId=${params.campaignId}`,
      );
      return await this.googleAdsCampaignModel.findById(googleAdsCampaign._id);
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

    if (!Array.isArray(campaign.products) || !campaign.products.length) {
      throw new BadRequestException('Campaign has no products');
    }
    if (
      !Array.isArray(googleAdsCampaign.adGroups) ||
      !googleAdsCampaign.adGroups.length
    ) {
      throw new BadRequestException(
        'Google Ads campaign record missing adGroups (run step-2 first)',
      );
    }

    const options = {
      connectionId: googleAdsCampaign.connectionId.toString(),
      loginCustomerId: googleAdsCampaign.googleAdsCustomerId,
    };

    const customerId = this.normalizeCustomerId(
      googleAdsCampaign.googleAdsCustomerId,
    );

    const previousStatus = googleAdsCampaign.processingStatus;

    try {
      await this.googleAdsCampaignModel.updateOne(
        { _id: googleAdsCampaign._id },
        {
          $set: {
            processingStatus: GoogleAdsProcessingStatus.GENERATING_KEYWORDS,
          },
        },
      );

      const adGroupResourceNames = googleAdsCampaign.adGroups
        .map((g) => g.resourceName)
        .filter(Boolean);

      if (!adGroupResourceNames.length) {
        throw new BadRequestException(
          'Google Ads campaign record has no adGroup resourceNames',
        );
      }

      for (let i = 0; i < campaign.products.length; i++) {
        const product = campaign.products[i];
        const url = product?.productLink;
        if (!url) {
          throw new BadRequestException(
            `Product ${String(product?.shopifyId || i)} missing productLink`,
          );
        }

        const generated = await this.googleAdsCustomerApi.generateKeywordIdeas(
          customerId,
          {
            includeAdultKeywords: false,
            pageSize: 30,
            urlSeed: { url },
          },
          { connectionId: options.connectionId },
        );

        const keywordTexts = (generated?.results || [])
          .map((r) => r?.text)
          .filter(Boolean) as string[];

        if (!keywordTexts.length) {
          throw new InternalServerErrorException(
            'No keywords found while generating keywords',
          );
        }

        const assignments = this.distributeKeywordsAcrossAdGroups({
          keywordTexts,
          adGroupCount: adGroupResourceNames.length,
        });

        // Add a bucket of keywords to each ad group. The bucket index is aligned
        // by adGroup index.
        for (
          let adGroupIndex = 0;
          adGroupIndex < adGroupResourceNames.length;
          adGroupIndex++
        ) {
          const adGroupResourceName = adGroupResourceNames[adGroupIndex];
          const assignedKeywords = assignments[adGroupIndex] || [];
          if (!assignedKeywords.length) continue;

          const keywords = assignedKeywords.flatMap((text) => [
            { text, matchType: GoogleAdsKeywordMatchType.EXACT },
            { text, matchType: GoogleAdsKeywordMatchType.BROAD },
            { text, matchType: GoogleAdsKeywordMatchType.PHRASE },
          ]);

          await this.googleAdsResourceApi.addKeywordsToAdGroup(
            {
              adGroupResourceName,
              keywords,
            },
            options,
          );
        }
      }

      await this.googleAdsCampaignModel.updateOne(
        { _id: googleAdsCampaign._id },
        {
          $set: {
            keywordsAddedToAdGroups: true,
            processingStatus: GoogleAdsProcessingStatus.KEYWORDS_ADDED,
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

  /* Step 4-
    -  adds geo targeting to the Google Ads campaign based on Campaign.location. 
    Uses state persisted in google-ads-campaigns by step 1.
    */
  async step4(params: { campaignId: string }) {
    if (!params.campaignId) {
      throw new BadRequestException('campaignId is required');
    }

    this.logger.log(
      `Step4(Adding geo targeting to campaign)--> start campaignId=${params.campaignId}`,
    );

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
          `Step4--> geo targeting already added; skipping. campaignId=${params.campaignId}`,
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
              `Step4--> skipping location because country code is not ISO-2 or ISO-3: country=${rawCountry}`,
            );
            return acc;
          }

          if (upper.length === 3 && !countryCodeMap[upper]) {
            this.logger.warn(
              `Step4--> skipping location because ISO-3 country is unmapped: country=${rawCountry}`,
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
          `Step4--> adding geo targeting country=${countryCode} locations=${uniqLocationNames.join(',')}`,
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

  /* Step 5-
    -  enables the Google Ads campaign. 
    Uses state persisted in google-ads-campaigns by step 1.
    */
  async step5(params: { campaignId: string }) {
    if (!params.campaignId) {
      throw new BadRequestException('campaignId is required');
    }

    this.logger.log(`Step5--> start campaignId=${params.campaignId}`);

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
