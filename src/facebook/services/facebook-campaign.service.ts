import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FacebookCampaign,
  FacebookAdSet,
  FacebookAd,
  FacebookCreativeAsset,
} from 'src/database/schema/facebook-campaign.schema';
import { FacebookBusinessManagerService } from './facebook-business-manager.service';
import {
  FacebookCampaignDataService,
  CampaignDataFromLambda,
} from './facebook-campaign-data.service';
import * as countries from 'i18n-iso-countries';
import { FacebookPage, FacebookAdAccount } from 'src/database/schema';

@Injectable()
export class FacebookCampaignService {
  private readonly logger = new Logger(FacebookCampaignService.name);

  //Store the sandbox ad account ID
  private readonly sandboxAdAccountId: string;

  constructor(
    @InjectModel('facebook-campaigns')
    private facebookCampaignModel: Model<FacebookCampaign>,
    @InjectModel('facebook-pages')
    private facebookPageModel: Model<FacebookPage>,
    @InjectModel('facebook-ad-accounts')
    private facebookAdAccountModel: Model<FacebookAdAccount>,
    private facebookMarketingApiService: FacebookBusinessManagerService,
    private facebookCampaignDataService: FacebookCampaignDataService,
  ) {
    this.sandboxAdAccountId = process.env.SANDBOX_AD_ACCOUNT_ID as string; //Load sandbox ID
  }

  //  Helper to get the effective Ad Account ID based on environment
  private getEffectiveAdAccountId(userProvidedAdAccountId: string): string {
    const nodeEnv = process.env.NODE_ENV || 'development';

    // In development or test, override with the sandbox account
    if (nodeEnv === 'development' || nodeEnv === 'test') {
      if (!this.sandboxAdAccountId) {
        this.logger.warn(
          `NODE_ENV is '${nodeEnv}' but SANDBOX_AD_ACCOUNT_ID is not set. Using user-provided Ad Account ID.`,
        );
        return userProvidedAdAccountId;
      }
      this.logger.debug(
        `NODE_ENV is '${nodeEnv}'. Overriding Ad Account ID to sandbox: ${this.sandboxAdAccountId}`,
      );
      return this.sandboxAdAccountId;
    }

    // In production, always use the user-provided Ad Account ID
    this.logger.debug(
      `NODE_ENV is '${nodeEnv}'. Using user-provided Ad Account ID: ${userProvidedAdAccountId}`,
    );
    return userProvidedAdAccountId;
  }

  /**
   * Step 1: Initialize Facebook Campaign
   * Creates the main campaign structure in Facebook with "Sales" objective
   */
  async initializeFacebookCampaign(
    campaignData: CampaignDataFromLambda,
    facebookCampaignDocument: FacebookCampaign, // Pass the MongoDB document
  ): Promise<{
    facebookCampaignId: string;
    facebookCampaignName: string | undefined;
  }> {
    try {
      this.logger.debug(
        `Step 1: Initializing Facebook campaign for Amplify campaign: ${campaignData.campaignId}`,
      );

      // Prevent re-initialization if already done
      if (
        facebookCampaignDocument.processingStatus !== 'PENDING' &&
        facebookCampaignDocument.processingStatus !== 'FAILED'
      ) {
        if (facebookCampaignDocument.facebookCampaignId) {
          this.logger.warn(
            `Campaign ${campaignData.campaignId} has already been initialized. Skipping.`,
          );
          return {
            facebookCampaignId: facebookCampaignDocument.facebookCampaignId,
            facebookCampaignName: facebookCampaignDocument.facebookCampaignName,
          };
        }
      }

      // Update our internal status to show we're starting this step
      await this.updateProcessingStatus(
        campaignData.campaignId,
        'INITIALIZING',
      );

      const campaignName = `Amplify Campaign - ${campaignData.type} - ${campaignData.campaignId}`;

      // Call the API service to create the campaign on Facebook
      const facebookCampaignResponse =
        await this.facebookMarketingApiService.createCampaign(
          facebookCampaignDocument.userAdAccountId,
          campaignName,
        );

      this.logger.debug(
        `Facebook campaign created successfully via API. ID: ${facebookCampaignResponse.id}`,
      );

      // Update our tracking document with the new Facebook Campaign ID
      await this.facebookCampaignModel.updateOne(
        { campaignId: campaignData.campaignId },
        {
          $set: {
            facebookCampaignId: facebookCampaignResponse.id,
            facebookCampaignName: campaignName,
            facebookStatus: 'PAUSED', // All campaigns start paused
            processingStatus: 'INITIALIZED', // Mark this step as complete
            failedStep: null,
            errorMessage: null,
            lastProcessedAt: new Date(),
          },
        },
      );

      this.logger.debug(
        `Successfully stored Facebook Campaign ID ${facebookCampaignResponse.id} in the database.`,
      );

      return {
        facebookCampaignId: facebookCampaignResponse.id,
        facebookCampaignName: campaignName,
      };
    } catch (error) {
      this.logger.error(
        `Failed to initialize Facebook campaign for Amplify campaign ${campaignData.campaignId}`,
        error,
      );

      // Mark this step as failed and store the error message
      await this.updateProcessingStatus(
        campaignData.campaignId,
        'FAILED',
        `Campaign initialization failed: ${error.message}`,
        'INITIALIZING', // Note the step that failed
      );

      throw error; // Re-throw the error to be handled by the controller
    }
  }

  /**
   * Step 2: Create Ad Sets
   * Creates ad sets based on products (max 4 ad sets, distribute budget equally)
   */
  /**
   * Step 2: Create a single Facebook Ad Set for the campaign.
   * This Ad Set will utilize dynamic creative (via asset_feed_spec later).
   */
  async createAdSets(campaignId: string): Promise<{
    adSetsCreated: number;
    adSetIds: string[];
    adSetName: string;
  }> {
    try {
      this.logger.debug(
        `Step 2: Creating a single Ad Set for Amplify campaign: ${campaignId}`,
      );

      const facebookCampaign = await this.getFacebookCampaign(campaignId);

      // Ensure campaign has been initialized
      if (!facebookCampaign.facebookCampaignId) {
        throw new BadRequestException(
          `Facebook campaign ${campaignId} not initialized. Call /initialize first.`,
        );
      }
      if (
        facebookCampaign.processingStatus !== 'INITIALIZED' &&
        facebookCampaign.processingStatus !== 'FAILED'
      ) {
        if (facebookCampaign.adSets && facebookCampaign.adSets.length > 0) {
          this.logger.warn(
            `Ad Set for campaign ${campaignId} already exists. Skipping creation.`,
          );
          const existingAdSet = facebookCampaign.adSets[0];
          return {
            adSetsCreated: 1,
            adSetIds: [existingAdSet.adSetId],
            adSetName: existingAdSet.name,
          };
        }
      }

      // Re-read original campaign data from the stored document
      const originalCampaignData =
        facebookCampaign.originalCampaignData as CampaignDataFromLambda;

      //  Get the user's Meta Pixel ID from the stored FacebookCampaign document
      const userMetaPixelId = facebookCampaign.metaPixelId; // We need to store this in facebookCampaign too!
      if (!userMetaPixelId) {
        throw new BadRequestException(
          'User has no Meta Pixel ID configured for this ad account. It is required for sales campaigns.',
        );
      }

      // Update our internal status
      await this.updateProcessingStatus(campaignId, 'CREATING_ADSETS');

      const adSetName = `Amplify AdSet - ${originalCampaignData.type} - ${campaignId}`;
      const dailyBudgetInCents = facebookCampaign.dailyBudget; // Use the already calculated daily budget in cents

      // Build targeting object from original campaign data
      const targeting = this.buildFacebookTargeting(originalCampaignData);

      // Create the single Ad Set via API
      const adSetResponse = await this.facebookMarketingApiService.createAdSet(
        facebookCampaign.userAdAccountId,
        facebookCampaign.facebookCampaignId,
        adSetName,
        dailyBudgetInCents,
        targeting,
        userMetaPixelId, //  Pass the user's pixel ID here
      );

      this.logger.debug(
        `Facebook Ad Set created successfully via API. ID: ${adSetResponse.id}`,
      );

      const adSetData: FacebookAdSet = {
        adSetId: adSetResponse.id,
        name: adSetName,
        dailyBudget: dailyBudgetInCents,
        currency: facebookCampaign.currency,
        status: 'PAUSED', // Ad Sets are created paused
        productIds: originalCampaignData.products.map((p) => p.shopifyId), // All products in this single Ad Set
        targetingConfig: adSetResponse.targeting, // Store the final targeting config
        createdAt: new Date(),
      };

      // Update Facebook campaign document with the new Ad Set
      await this.facebookCampaignModel.updateOne(
        { campaignId },
        {
          $set: {
            adSets: [adSetData], // Store as an array with one element
            processingStatus: 'ADSETS_CREATED', // Mark this step as complete
            failedStep: null,
            errorMessage: null,
            lastProcessedAt: new Date(),
          },
        },
      );

      this.logger.debug(
        `Successfully stored Facebook Ad Set ID ${adSetResponse.id} in the database.`,
      );

      return {
        adSetsCreated: 1,
        adSetIds: [adSetResponse.id],
        adSetName: adSetName,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create Ad Set for Amplify campaign ${campaignId}`,
        error,
      );

      // Mark this step as failed
      await this.updateProcessingStatus(
        campaignId,
        'FAILED',
        `Ad Set creation failed: ${error.message}`,
        'CREATING_ADSETS',
      );

      throw error;
    }
  }

  /**
   * Helper method to build Facebook targeting object from CampaignDataFromLambda.
   * This is where we interpret the `location` data.
   */
  private buildFacebookTargeting(campaignData: CampaignDataFromLambda): any {
    const normalizedCountryCodes = campaignData.location
      .map((loc) => this.normalizeCountryCode(loc.country))
      .filter((code) => code !== null);

    // Validation: Ensure we have at least one valid country
    if (normalizedCountryCodes.length === 0) {
      throw new Error(
        'Targeting validation failed: No valid country codes were provided or could be normalized.',
      );
    }

    const geoLocations: any = {
      countries: normalizedCountryCodes,
      // We could add more granular targeting here (e.g., cities, regions)
      // if campaignData provides them consistently and we have Meta IDs for them.
      // For now, stick to countries.
    };

    return {
      geo_locations: geoLocations,
      // age_min: 18, // Default min age
      // age_max: 65, // Default max age
      // genders: [1, 2], // 1=Male, 2=Female, 3=All (use all by default for dynamic creative)
      // interests: campaignData.products.map(p => p.category), // Basic mapping, can be improved
      // behavior targeting can also be added here
      // For Advantage+ Creative, often broader targeting is preferred initially.
    };
  }

  /**
   * Step 3: Create a single "Flexible" Ad Creative
   * Gathers all assets (images, texts, etc.) into one dynamic creative via asset_feed_spec.
   */
  async createCreatives(campaignId: string): Promise<{
    creativesCreated: number;
    creativeIds: string[];
  }> {
    try {
      this.logger.debug(
        `Step 3: Creating flexible creative for Amplify campaign: ${campaignId}`,
      );

      const facebookCampaign = await this.getFacebookCampaign(campaignId);
      //  Get the user's primary ad account details, which now includes the selected page
      const primaryAdAccount = await this.facebookAdAccountModel
        .findOne({
          userId: facebookCampaign.userId,
          isPrimary: true,
        })
        .lean();

      if (!primaryAdAccount?.selectedPrimaryFacebookPageId) {
        throw new BadRequestException(
          'Primary ad account has no selected Facebook Page. Please configure it first.',
        );
      }

      const page = await this.facebookPageModel
        .findById(primaryAdAccount.selectedPrimaryFacebookPageId)
        .lean();

      const pageId = page?.pageId;
      const campaignData =
        facebookCampaign.originalCampaignData as CampaignDataFromLambda;

      // Prevent re-running if already completed
      if (
        facebookCampaign.processingStatus === 'CREATIVES_CREATED' &&
        facebookCampaign.creatives.length > 0
      ) {
        this.logger.warn(
          `Creatives for campaign ${campaignId} have already been created. Skipping.`,
        );
        return {
          creativesCreated: facebookCampaign.creatives.length,
          creativeIds: facebookCampaign.creatives.map((c) => c.creativeId),
        };
      }

      await this.updateProcessingStatus(campaignId, 'CREATING_CREATIVES');

      // 1. Gather all unique assets from all products
      const allImageUrls = new Set<string>();
      const allPrimaryTexts = new Set<string>();
      const allHeadlines = new Set<string>();
      const allLinkUrls = new Set<string>();

      for (const product of campaignData.products) {
        // Add product link to be used as a destination
        allLinkUrls.add(product.productLink);

        // Generate unique ad copy and headline for each product
        allPrimaryTexts.add(
          this.generateAdCopy(product, campaignData.tone ?? 'professional'),
        );
        allHeadlines.add(this.generateHeadline(product));

        // Gather unique image URLs from creative data
        const facebookCreatives = product.creatives.filter(
          (c) => c.channel.toLowerCase() === 'facebook',
        );

        for (const creative of facebookCreatives) {
          this.logger.debug(`"creatives to parse`, {
            initialCreatives: product.creatives,
            creativeToParse: creative,
          });
          const url = this.parseCreativeDataUrl(creative.data);
          if (url) allImageUrls.add(url);
        }
      }

      this.logger.debug(
        `Gathered unique assets: ${allImageUrls.size} images, ${allPrimaryTexts.size} texts, ${allHeadlines.size} headlines.`,
      );

      // 2. Upload images to Facebook to get their hashes
      const imageHashes = await this.uploadImagesToFacebook(
        facebookCampaign.userAdAccountId,
        Array.from(allImageUrls),
      );

      /**
       * 3. Build the asset_feed_spec for the flexible creative
       * @see https://developers.facebook.com/docs/marketing-api/ad-creative/asset-feed-spec/
       */
      const assetFeedSpec = {
        images: imageHashes.map((hash) => ({ hash: hash })),
        bodies: Array.from(allPrimaryTexts).map((text) => ({ text })),
        titles: Array.from(allHeadlines).map((text) => ({ text })),
        link_urls: Array.from(allLinkUrls).map((url) => ({ website_url: url })),
        call_to_action_types: ['SHOP_NOW'],
        /**
         *  Array of Facebook ad formats we should create the ads in. Supported formats are: SINGLE_IMAGE, CAROUSEL, SINGLE_VIDEO, AUTOMATIC_FORMAT.
         */
        ad_formats: ['SINGLE_IMAGE'],
      };

      // TODO: Fetch and add instagram_user_id here for Instagram placements

      // 4. Call the API to create the single flexible creative
      const creativeName = `Amplify Flexible Creative - ${campaignData.campaignId}`;
      const creativeResponse =
        await this.facebookMarketingApiService.createFlexibleCreative(
          facebookCampaign.userAdAccountId,
          creativeName,
          assetFeedSpec,
          pageId as string,
        );

      this.logger.debug(
        `Flexible creative created successfully via API. ID: ${creativeResponse.id}`,
      );

      // 5. Prepare the creative data for our database
      const newCreative: FacebookCreativeAsset = {
        creativeId: creativeResponse.id,
        name: creativeName,
        // For simplicity, we can store the first image/link as representative
        imageUrl: Array.from(allImageUrls)[0],
        destinationUrl: Array.from(allLinkUrls)[0],
        primaryText: Array.from(allPrimaryTexts)[0],
        headline: Array.from(allHeadlines)[0],
        callToAction: 'SHOP_NOW',
        approvalStatus: 'PENDING',
        createdAt: new Date(),
      };

      // 6. Update the tracking document
      await this.facebookCampaignModel.updateOne(
        { campaignId },
        {
          $set: {
            creatives: [newCreative], // We only have one flexible creative
            processingStatus: 'CREATIVES_CREATED',
            failedStep: null,
            errorMessage: null,
            lastProcessedAt: new Date(),
          },
        },
      );

      this.logger.debug(
        `Successfully stored flexible creative ID ${creativeResponse.id} in the database.`,
      );

      return {
        creativesCreated: 1,
        creativeIds: [creativeResponse.id],
      };
    } catch (error) {
      this.logger.error(
        `Failed to create flexible creative for campaign: ${campaignId}`,
        error,
      );
      await this.updateProcessingStatus(
        campaignId,
        'FAILED',
        `Flexible creative creation failed: ${error.message}`,
        'CREATING_CREATIVES',
      );
      throw error;
    }
  }

  /**
   * Step 4: Create a Single Ad
   * Links the single Ad Set and the single flexible Creative together.
   */
  async createAds(campaignId: string): Promise<{
    adsCreated: number;
    adIds: string[];
  }> {
    try {
      this.logger.debug(
        `Step 4: Creating single ad for Amplify campaign: ${campaignId}`,
      );

      const facebookCampaign = await this.getFacebookCampaign(campaignId);

      // Prevent re-running if already completed
      if (
        facebookCampaign.processingStatus === 'ADS_CREATED' &&
        facebookCampaign.ads.length > 0
      ) {
        this.logger.warn(
          `Ad for campaign ${campaignId} has already been created. Skipping.`,
        );
        return {
          adsCreated: facebookCampaign.ads.length,
          adIds: facebookCampaign.ads.map((ad) => ad.adId),
        };
      }

      // Validate that previous steps are complete
      if (
        facebookCampaign.adSets.length === 0 ||
        facebookCampaign.creatives.length === 0
      ) {
        throw new BadRequestException(
          'Cannot create ad: Ad Set or Creative is missing. Please run previous steps first.',
        );
      }

      await this.updateProcessingStatus(campaignId, 'CREATING_ADS');

      // Get the IDs from the single Ad Set and Creative
      const adSetId = facebookCampaign.adSets[0].adSetId;
      const creativeId = facebookCampaign.creatives[0].creativeId;

      const adName = `Amplify Ad - ${facebookCampaign.originalCampaignData.campaignId}`;

      // Call the API service to create the single ad
      const adResponse = await this.facebookMarketingApiService.createAd(
        facebookCampaign.userAdAccountId,
        adSetId,
        creativeId,
        adName,
      );

      this.logger.debug(
        `Facebook Ad created successfully via API. ID: ${adResponse.id}`,
      );

      // Prepare the Ad data for our database
      const newAd: FacebookAd = {
        adId: adResponse.id,
        adSetId,
        creativeId,
        name: adName,
        status: adResponse.status || 'PAUSED',
        // We can link to the first product as a representative
        productId: (
          facebookCampaign.originalCampaignData as CampaignDataFromLambda
        ).products[0]?.shopifyId,
        createdAt: new Date(),
      };

      // Update the tracking document with the new Ad
      await this.facebookCampaignModel.updateOne(
        { campaignId },
        {
          $set: {
            ads: [newAd], // We only have one ad
            processingStatus: 'ADS_CREATED',
            failedStep: null,
            errorMessage: null,
            lastProcessedAt: new Date(),
          },
        },
      );

      this.logger.debug(
        `Successfully stored Ad ID ${adResponse.id} in the database.`,
      );

      return {
        adsCreated: 1,
        adIds: [adResponse.id],
      };
    } catch (error) {
      this.logger.error(
        `Failed to create ad for campaign: ${campaignId}`,
        error,
      );
      await this.updateProcessingStatus(
        campaignId,
        'FAILED',
        `Ad creation failed: ${error.message}`,
        'CREATING_ADS',
      );
      throw error;
    }
  }

  /**
   * Step 5: Launch Campaign
   * Activates the Campaign, Ad Set, and Ad in the correct sequence.
   */
  async launchCampaign(campaignId: string): Promise<{
    facebookStatus: string;
    reviewStatus: string; // This is an effective status from Facebook's perspective
  }> {
    try {
      this.logger.debug(`Step 5: Launching Amplify campaign: ${campaignId}`);

      const facebookCampaign = await this.getFacebookCampaign(campaignId);

      // Prevent re-launching
      if (
        facebookCampaign.processingStatus === 'LAUNCHED' ||
        facebookCampaign.facebookStatus === 'ACTIVE'
      ) {
        this.logger.warn(
          `Campaign ${campaignId} has already been launched. Skipping.`,
        );
        return {
          facebookStatus: facebookCampaign.facebookStatus,
          reviewStatus: 'UNDER_REVIEW', // Assume it's in review if already launched
        };
      }

      // Validate that all components exist before trying to launch
      if (
        facebookCampaign.ads.length === 0 ||
        !facebookCampaign.facebookCampaignId ||
        facebookCampaign.adSets.length === 0
      ) {
        throw new BadRequestException(
          'Cannot launch campaign: Missing Campaign, Ad Set, or Ad. Please run previous steps first.',
        );
      }

      await this.updateProcessingStatus(campaignId, 'LAUNCHING');

      // It's crucial to activate components in the correct order: Ad -> Ad Set -> Campaign
      const adId = facebookCampaign.ads[0].adId;
      const adSetId = facebookCampaign.adSets[0].adSetId;
      const fbCampaignId = facebookCampaign.facebookCampaignId;

      this.logger.debug(
        `Activating components for campaign ${fbCampaignId}: Ad (${adId}), AdSet (${adSetId}), Campaign (${fbCampaignId})`,
      );

      // 1. Activate the Ad
      await this.facebookMarketingApiService.updateStatus(adId, 'ACTIVE');
      this.logger.log(`Ad ${adId} status now Active`);

      // 2. Activate the Ad Set
      await this.facebookMarketingApiService.updateStatus(adSetId, 'ACTIVE');
      this.logger.log(`Adset ${adSetId} status now Active`);

      // 3. Activate the Campaign
      await this.facebookMarketingApiService.updateStatus(
        fbCampaignId,
        'ACTIVE',
      );
      this.logger.log(`Campaign ${fbCampaignId} status now Active`);

      this.logger.debug(
        `All components for campaign ${fbCampaignId} have been set to ACTIVE.`,
      );

      // Update the final status in our database
      await this.facebookCampaignModel.updateOne(
        { campaignId },
        {
          $set: {
            'ads.$[].status': 'ACTIVE',
            'adSets.$[].status': 'ACTIVE',
            facebookStatus: 'ACTIVE', // Note: Facebook's "effective_status" will be IN_REVIEW initially
            processingStatus: 'LAUNCHED',
            failedStep: null,
            errorMessage: null,
            lastProcessedAt: new Date(),
          },
        },
      );

      this.logger.debug(
        `Successfully updated database status to LAUNCHED for campaign: ${campaignId}`,
      );

      return {
        facebookStatus: 'ACTIVE', // Our intent is active
        reviewStatus: 'IN_REVIEW', // Facebook's initial state after activation
      };
    } catch (error) {
      this.logger.error(`Failed to launch campaign: ${campaignId}`, error);
      await this.updateProcessingStatus(
        campaignId,
        'FAILED',
        `Campaign launch failed: ${error.message}`,
        'LAUNCHING',
      );
      throw error;
    }
  }

  /**
   * Get the current processing and Facebook status of a campaign.
   */
  async getCampaignStatus(campaignId: string): Promise<{
    processingStatus: string;
    facebookStatus?: string;
    failedStep?: string;
    errorMessage?: string;
    adSetsCreated: number;
    creativesCreated: number;
    adsCreated: number;
    isReadyForNextStep: boolean;
    nextStep?: string;
  }> {
    try {
      this.logger.debug(`Getting status for Amplify campaign: ${campaignId}`);
      const facebookCampaign = await this.getFacebookCampaign(campaignId);

      const statusMap = {
        PENDING: { next: 'INITIALIZE', ready: true },
        INITIALIZED: { next: 'CREATE_ADSETS', ready: true },
        ADSETS_CREATED: { next: 'CREATE_CREATIVES', ready: true },
        CREATIVES_CREATED: { next: 'CREATE_ADS', ready: true },
        ADS_CREATED: { next: 'LAUNCH', ready: true },
        LAUNCHED: { next: null, ready: false },
        FAILED: { next: facebookCampaign.failedStep, ready: false },
      };

      const currentStatusInfo = statusMap[
        facebookCampaign.processingStatus
      ] || { next: null, ready: false };

      return {
        processingStatus: facebookCampaign.processingStatus,
        facebookStatus: facebookCampaign.facebookStatus,
        failedStep: facebookCampaign.failedStep,
        errorMessage: facebookCampaign.errorMessage,
        adSetsCreated: facebookCampaign.adSets?.length || 0,
        creativesCreated: facebookCampaign.creatives?.length || 0,
        adsCreated: facebookCampaign.ads?.length || 0,
        isReadyForNextStep: currentStatusInfo.ready,
        nextStep: currentStatusInfo.next,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get campaign status for campaign: ${campaignId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retry a specific step that previously failed.
   */
  async retryStep(
    campaignId: string,
    stepToRetry: string,
  ): Promise<{
    completedStep: string;
    nextStep: string | null;
    data: any;
  }> {
    try {
      this.logger.debug(
        `Retrying step '${stepToRetry}' for Amplify campaign: ${campaignId}`,
      );

      const facebookCampaign = await this.getFacebookCampaign(campaignId);

      // 1. Validate that the campaign is actually in a failed state
      if (
        facebookCampaign.processingStatus !== 'FAILED' ||
        facebookCampaign.failedStep !== stepToRetry
      ) {
        throw new BadRequestException(
          `Campaign is not in a failed state at step '${stepToRetry}'. Current status: ${facebookCampaign.processingStatus}`,
        );
      }

      // 2. Check retry limit (e.g., max 2 retries as per requirements)
      if (facebookCampaign.retryCount >= 2) {
        throw new BadRequestException(
          `Maximum retry attempts (2) exceeded for campaign ${campaignId}. Please contact support.`,
        );
      }

      // 3. Increment retry counter and clear previous error
      await this.facebookCampaignModel.updateOne(
        { campaignId },
        {
          $inc: { retryCount: 1 },
          $set: { errorMessage: null, failedStep: null },
        },
      );

      // Get the original campaign data needed for the retry
      const campaignData =
        facebookCampaign.originalCampaignData as CampaignDataFromLambda;

      // 4. Execute the specific step
      let result: any;
      let nextStep: string | null;

      switch (stepToRetry) {
        case 'INITIALIZING':
          result = await this.initializeFacebookCampaign(
            campaignData,
            facebookCampaign,
          );
          nextStep = 'CREATE_ADSETS';
          break;
        case 'CREATING_ADSETS':
          result = await this.createAdSets(campaignId);
          nextStep = 'CREATE_CREATIVES';
          break;
        case 'CREATING_CREATIVES':
          result = await this.createCreatives(campaignId);
          nextStep = 'CREATE_ADS';
          break;
        case 'CREATING_ADS':
          result = await this.createAds(campaignId);
          nextStep = 'LAUNCH';
          break;
        case 'LAUNCHING':
          result = await this.launchCampaign(campaignId);
          nextStep = null; // Final step
          break;
        default:
          throw new BadRequestException(
            `Unknown or non-retryable step: ${stepToRetry}`,
          );
      }

      this.logger.debug(
        `Successfully retried step '${stepToRetry}' for campaign: ${campaignId}`,
      );

      return {
        completedStep: stepToRetry,
        nextStep,
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to retry step '${stepToRetry}' for campaign: ${campaignId}`,
        error,
      );
      // The individual step method will have already marked the campaign as FAILED.
      throw error;
    }
  }

  /**
   * Helper method to upload multiple images and get their hashes.
   */
  private async uploadImagesToFacebook(
    adAccountId: string,
    imageUrls: string[],
  ): Promise<string[]> {
    const uploadPromises = imageUrls.map((url) =>
      this.facebookMarketingApiService.uploadImageByUrl(adAccountId, url),
    );
    const results = await Promise.all(uploadPromises);
    return results.map((res) => res.hash);
  }

  // === HELPER METHODS ===

  /**
   * Get Facebook campaign tracking document
   */
  private async getFacebookCampaign(
    campaignId: string,
  ): Promise<FacebookCampaign> {
    const facebookCampaign = await this.facebookCampaignModel
      .findOne({ campaignId })
      .exec();

    if (!facebookCampaign) {
      throw new NotFoundException(`Facebook campaign not found: ${campaignId}`);
    }

    return facebookCampaign;
  }

  /**
   * Get original campaign data (stored during initialization)
   * For now, we'll need to store this when creating the Facebook campaign
   * TODO: This could be stored in the FacebookCampaign document or passed through each step
   */
  // private async getOriginalCampaignData(
  //   campaignId: string,
  // ): Promise<CampaignDataFromLambda> {
  //   // For now, throw error - this needs to be implemented based on how we store original data
  //   throw new Error(
  //     `Original campaign data retrieval not implemented yet. Campaign: ${campaignId}`,
  //   );
  // }

  /**
   * Update processing status with error handling
   */
  private async updateProcessingStatus(
    campaignId: string,
    status: string,
    errorMessage?: string,
    failedStep?: string,
  ): Promise<void> {
    const updatePayload: any = {
      processingStatus: status,
      lastProcessedAt: new Date(),
    };

    if (errorMessage) {
      updatePayload.errorMessage = errorMessage.substring(0, 1000); // Truncate for safety
    }
    if (failedStep) {
      updatePayload.failedStep = failedStep;
    }

    await this.facebookCampaignModel.updateOne(
      { campaignId },
      { $set: updatePayload },
    );
  }

  /**
   * Plan ad set strategy (max 4 ad sets, distribute products)
   */
  private planAdSetStrategy(products: any[]): {
    adSets: Array<{ name: string; productIds: string[] }>;
    budgetPerAdSet: number;
  } {
    // Limit to 4 ad sets max
    const maxAdSets = Math.min(4, products.length);
    const productsPerAdSet = Math.ceil(products.length / maxAdSets);

    const adSets: Array<{ name: string; productIds: string[] }> = [];

    for (let i = 0; i < maxAdSets; i++) {
      const startIndex = i * productsPerAdSet;
      const endIndex = Math.min(startIndex + productsPerAdSet, products.length);
      const adSetProducts = products.slice(startIndex, endIndex);

      adSets.push({
        name:
          adSetProducts.length === 1
            ? `${adSetProducts[0].title} - AdSet`
            : `Products ${startIndex + 1}-${endIndex} - AdSet`,
        productIds: adSetProducts.map((p) => p.shopifyId),
      });
    }

    return {
      adSets,
      budgetPerAdSet: 0, // Will be calculated from campaign budget
    };
  }

  /**
   * Parse creative data URL from JSON string
   */
  private parseCreativeDataUrl(creativeData: any[]): string | null {
    try {
      for (const data of creativeData) {
        // If it's already a proper object
        if (typeof data === 'object' && data.url) {
          return data.url;
        }

        // If it's a string that needs parsing
        if (typeof data === 'string') {
          // First, try to parse as regular JSON
          try {
            const parsed = JSON.parse(data);
            if (parsed.url) return parsed.url;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (e) {
            // If regular JSON parsing fails, try handling single quotes
            const fixedJsonString = data.replace(/'/g, '"');
            const parsed = JSON.parse(fixedJsonString);
            if (parsed.url) return parsed.url;
          }
        }
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to parse creative data URL', {
        creativeData,
        error,
      });
      throw new BadRequestException('Invalid creative data format');
    }
  }
  // private parseCreativeDataUrl(creativeData: string[]): string {
  //   try {
  //     // Data comes as: ['{"url":"http://s3.image.com/fb-ad-1"}']
  //     const parsedData = JSON.parse(creativeData[0]);
  //     return parsedData.url;
  //   } catch (error) {
  //     this.logger.error('Failed to parse creative data URL', {
  //       creativeData,
  //       error,
  //     });
  //     throw new BadRequestException('Invalid creative data format');
  //   }
  // }

  /**
   * Generate ad copy based on product and tone
   */
  private generateAdCopy(product: any, tone: string): string {
    // Simple ad copy generation - can be enhanced with AI later
    tone = tone ? tone : 'professional';
    const toneAdjectives = {
      playful: 'Amazing',
      professional: 'Premium',
      energetic: 'Incredible',
      friendly: 'Perfect',
    };

    const adjective = toneAdjectives[tone.toLowerCase()] || 'Great';

    return `${adjective} ${product.title}! ${product.description} Shop now for just $${product.price}!`;
  }

  private readonly COUNTRY_ALIAS_MAP: { [key: string]: string } = {
    USA: 'US', // Maps "USA" -> "US"
    'U.S.A.': 'US',
    AMERICA: 'US',
    UK: 'GB', // Maps "UK" -> "GB"
    'U.K.': 'GB',
    ENGLAND: 'GB',
    UAE: 'AE', // United Arab Emirates
    // Add any other specific shortcuts we might expect from frontend
  };

  /**
   * Normalizes a country input to its ISO Alpha-2 code.
   * 1. Checks custom alias map first.
   * 2. Then falls back to the i18n-iso-countries library.
   * Returns null if the input cannot be recognized.
   */
  private normalizeCountryCode(input: string): string | null {
    if (!input) return null;

    const trimmedInput = input.trim().toUpperCase();

    // 1. FIRST, CHECK OUR CUSTOM MAP OF ALIASES
    if (Object.hasOwn(this.COUNTRY_ALIAS_MAP, trimmedInput)) {
      return this.COUNTRY_ALIAS_MAP[trimmedInput];
    }

    // 2. CHECK IF IT'S A VALID CODE (using the library's isValid method)
    if (countries.isValid(trimmedInput)) {
      // If it's already a valid alpha-2 code, return it
      if (trimmedInput.length === 2 && countries.alpha2ToAlpha3(trimmedInput)) {
        return trimmedInput;
      }

      // If it's a valid alpha-3 code, convert to alpha-2
      if (trimmedInput.length === 3) {
        const alpha2Code = countries.alpha3ToAlpha2(trimmedInput);
        if (alpha2Code) return alpha2Code;
      }

      // For numeric codes or other valid formats
      const alpha2Code = countries.toAlpha2(trimmedInput);
      if (alpha2Code) return alpha2Code;
    }

    // 3. CHECK FOR FULL NAME (in English) (e.g., "United States of America")
    const alpha2FromName = countries.getAlpha2Code(trimmedInput, 'en');
    if (alpha2FromName) {
      return alpha2FromName;
    }

    // 4. Input not recognized by any method
    this.logger.debug(`Could not normalize country code: ${input}`);
    return null;
  }

  /**
   * Generate headline for ad
   */
  private generateHeadline(product: any): string {
    return `${product.title} - $${product.price}`;
  }

  // === FACEBOOK API METHODS (to be implemented) ===

  // private async createFacebookCampaignViaAPI(
  //   campaignData: any,
  //   adAccountId: string,
  // ): Promise<any> {
  //   // TODO: Implement actual Facebook Marketing API call
  //   return { id: 'fb_campaign_123', name: campaignData.type, status: 'PAUSED' };
  // }

  // private async createSingleAdSet(
  //   facebookCampaign: any,
  //   adSetPlan: any,
  //   campaignData: any,
  //   budget: number,
  // ): Promise<any> {
  //   // TODO: Implement actual Facebook Ad Set creation
  //   return { id: 'fb_adset_123', status: 'PAUSED', targeting: {} };
  // }

  // private async createFacebookCreative(
  //   facebookCampaign: any,
  //   product: any,
  //   imageUrl: string,
  //   campaignData: any,
  // ): Promise<any> {
  //   // TODO: Implement actual Facebook Creative creation
  //   return { id: 'fb_creative_123' };
  // }

  // private async createSingleFacebookAd(
  //   adAccountId: string,
  //   adSetId: string,
  //   creativeId: string,
  //   name: string,
  // ): Promise<any> {
  //   // TODO: Implement actual Facebook Ad creation
  //   return { id: 'fb_ad_123', status: 'PAUSED' };
  // }

  // private async activateCampaignComponents(
  //   facebookCampaign: FacebookCampaign,
  // ): Promise<void> {
  //   // TODO: Implement activation of campaign, ad sets, and ads
  //   this.logger.debug('Activating campaign components...');
  // }
}
