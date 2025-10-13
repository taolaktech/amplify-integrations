import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FacebookPage,
  FacebookAdAccount,
  InstagramAccount,
} from 'src/database/schema';
import { Campaign } from 'src/database/schema/campaign.schema';
import { FacebookCampaign } from 'src/database/schema/facebook-campaign.schema';
// import { CampaignPlatform } from 'src/enums/campaign';

// DTO for campaign data coming from Amplify-Manager via Lambda
export interface CampaignDataFromLambda {
  campaignId: string; // MongoDB ObjectId as string
  pageId: string;
  metaPixelId: string;
  userId: string; // User who created the campaign
  businessId: string; // Business this campaign belongs to
  type: string; // Campaign type
  brandColor: string; // Brand colors
  accentColor: string;
  tone: string; // Tone for ad copy
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  totalBudget: number; // Total budget across all platforms
  platforms: string[]; // ['FACEBOOK', 'INSTAGRAM', 'GOOGLE']
  location: Array<{
    // Targeting locations
    country: string;
    city: string;
    state: string;
  }>;
  products: Array<{
    // Products to advertise
    shopifyId: string;
    title: string;
    price: number;
    description: string;
    audience?: string;
    occasion?: string;
    features: string[];
    category: string;
    imageLink: string;
    productLink: string;
    creatives: Array<{
      // Facebook creatives for this product
      id: string;
      channel: string; // 'facebook'
      budget: number; // ?? Still unclear what this is for
      data: string[]; // ['{"url":"http://s3.image.com/fb-ad-1"}']
    }>;
  }>;
}

@Injectable()
export class FacebookCampaignDataService {
  private readonly logger = new Logger(FacebookCampaignDataService.name);

  constructor(
    @InjectModel('campaigns')
    private campaignModel: Model<Campaign>,
    @InjectModel('facebook-pages')
    private facebookPageModel: Model<FacebookPage>,
    @InjectModel('facebook-ad-accounts')
    private facebookAdAccountModel: Model<FacebookAdAccount>,
    @InjectModel('facebook-campaigns')
    private facebookCampaignModel: Model<FacebookCampaign>,
    @InjectModel('instagram-accounts')
    private instagramAccountModel: Model<InstagramAccount>,
  ) {}

  // /**
  //  * Get campaign data by ID for Facebook campaign creation
  //  * This will be called by Lambda functions via REST API
  //  */
  // async getCampaignForFacebook(campaignId: string): Promise<{
  //   campaign: Campaign;
  //   facebookBudget: number;
  //   dailyBudget: number;
  //   platformCount: number;
  // }> {
  //   try {
  //     this.logger.debug(
  //       `Fetching campaign data for Facebook processing: ${campaignId}`,
  //     );

  //     // Get the main campaign document
  //     const campaign = await this.campaignModel.findById(campaignId).lean();

  //     if (!campaign) {
  //       throw new NotFoundException(`Campaign ${campaignId} not found`);
  //     }

  //     // Check if Facebook is in the selected platforms
  //     if (!campaign.platforms.includes(CampaignPlatform.FACEBOOK)) {
  //       throw new NotFoundException(
  //         `Campaign ${campaignId} does not target Facebook platform`,
  //       );
  //     }

  //     // Calculate Facebook's budget allocation
  //     const platformCount = campaign.platforms.length; // Number of platforms (Facebook, Instagram, Google)
  //     const facebookBudget = campaign.totalBudget / platformCount; // Equal distribution

  //     // Convert to daily budget (assume campaign runs for the duration)
  //     const campaignDurationDays = Math.ceil(
  //       (new Date(campaign.endDate).getTime() -
  //         new Date(campaign.startDate).getTime()) /
  //         (1000 * 60 * 60 * 24),
  //     );
  //     const dailyBudget = Math.max(
  //       1,
  //       Math.floor(facebookBudget / campaignDurationDays),
  //     ); // At least $1/day

  //     this.logger.debug(`Campaign budget calculation:`, {
  //       totalBudget: campaign.totalBudget,
  //       platformCount,
  //       facebookBudget,
  //       campaignDurationDays,
  //       dailyBudget,
  //     });

  //     return {
  //       campaign,
  //       facebookBudget,
  //       dailyBudget,
  //       platformCount,
  //     };
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to get campaign data for Facebook: ${campaignId}`,
  //       error,
  //     );
  //     throw error;
  //   }
  // }

  /**
   * Process campaign data from Lambda and calculate Facebook-specific budget
   * Lambda provides campaign data from Amplify-Manager
   */
  processCampaignDataForFacebook(campaignData: CampaignDataFromLambda): {
    facebookBudget: number;
    dailyBudget: number;
    platformCount: number;
    campaignDurationDays: number;
  } {
    try {
      this.logger.debug(
        `Processing campaign data for Facebook: ${campaignData.campaignId}`,
      );

      // Validate Facebook or Instagram is in platforms
      if (
        !campaignData.platforms.includes('FACEBOOK') &&
        !campaignData.platforms.includes('INSTAGRAM')
      ) {
        throw new Error(
          `Campaign ${campaignData.campaignId} does not target a valid platform (Facebook or Instagram)`,
        );
      }

      // Calculate Facebook's budget allocation
      const platformCount = campaignData.platforms.length;
      const facebookBudget = campaignData.totalBudget / platformCount; // Equal distribution

      // Calculate campaign duration and daily budget
      const startDate = new Date(campaignData.startDate);
      const endDate = new Date(campaignData.endDate);
      const campaignDurationDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      const dailyBudget = Math.max(
        1,
        Math.floor(facebookBudget / campaignDurationDays),
      ); // At least $1/day

      this.logger.debug(`Facebook budget calculation:`, {
        totalBudget: campaignData.totalBudget,
        platformCount,
        facebookBudget,
        campaignDurationDays,
        dailyBudget,
      });

      return {
        facebookBudget,
        dailyBudget,
        platformCount,
        campaignDurationDays,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process campaign data for Facebook: ${campaignData.campaignId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create Facebook campaign tracking document from Lambda-provided data
   */
  async createFacebookCampaignFromLambda(
    campaignData: CampaignDataFromLambda,
    userAdAccountId?: string, // Make optional
    instagramAccountId?: string, // Add Instagram account ID
  ): Promise<FacebookCampaign> {
    try {
      const existing = await this.facebookCampaignModel
        .findOne({
          campaignId: campaignData.campaignId,
        })
        .exec();

      if (existing) {
        this.logger.debug(
          `Facebook campaign tracking already exists: ${existing._id.toString()}`,
        );
        // If we are re-processing, update the original data
        if (
          JSON.stringify(existing.originalCampaignData) !==
          JSON.stringify(campaignData)
        ) {
          await this.facebookCampaignModel.updateOne(
            { _id: existing._id },
            { $set: { originalCampaignData: campaignData } },
          );
          this.logger.debug(
            `Updated original campaign data for existing record.`,
          );
        }
        return existing;
      }

      // Determine the final Ad Account ID to use
      let finalAdAccountId = userAdAccountId;
      let finalMetaPixelId: string;

      // If Instagram is included but no Ad Account is provided, find it from Instagram
      if (
        !finalAdAccountId &&
        campaignData.platforms.includes('INSTAGRAM') &&
        instagramAccountId
      ) {
        const instagramAccount = await this.instagramAccountModel.findOne({
          userId: campaignData.userId,
          instagramAccountId: instagramAccountId,
        });

        if (!instagramAccount) {
          throw new BadRequestException('Instagram account not found');
        }

        if (!instagramAccount.associatedAdAccountId) {
          throw new BadRequestException(
            "No Facebook Ad Account associated with this Instagram account. Please select a primary Facebook Ad Account for the Instagram account's Facebook Page.",
          );
        }

        finalAdAccountId = instagramAccount.associatedAdAccountId;
      }

      // If we still don't have an Ad Account, check if Facebook is required
      if (!finalAdAccountId) {
        if (campaignData.platforms.includes('FACEBOOK')) {
          throw new BadRequestException(
            'Facebook Ad Account is required for Facebook campaigns',
          );
        } else {
          throw new BadRequestException(
            'Facebook Ad Account is required to create campaigns',
          );
        }
      }

      // Get the primary ad account to retrieve its metaPixelId
      const primaryAdAccount = await this.facebookAdAccountModel
        .findOne({
          userId: campaignData.userId,
          accountId: finalAdAccountId,
          isPrimary: true,
          integrationStatus: 'READY_FOR_CAMPAIGNS',
        })
        .lean();

      if (!primaryAdAccount) {
        throw new BadRequestException(
          `User ${campaignData.userId} has no ready Facebook ad account for campaign creation. Please set up ad account first.`,
        );
      }

      if (!primaryAdAccount.metaPixelId) {
        throw new BadRequestException(
          `User ${campaignData.userId} has no configured Meta Pixel ID for ad account ${finalAdAccountId}.`,
        );
      }

      finalMetaPixelId = primaryAdAccount.metaPixelId;

      const { facebookBudget, dailyBudget } =
        this.processCampaignDataForFacebook(campaignData);

      const facebookCampaign = await this.facebookCampaignModel.create({
        campaignId: campaignData.campaignId,
        userId: campaignData.userId,
        userAdAccountId: finalAdAccountId,
        instagramAccountId: instagramAccountId, // Store Instagram account ID
        allocatedBudget: facebookBudget,
        dailyBudget: dailyBudget * 100,
        currency: 'USD',
        processingStatus: 'PENDING',
        metaPixelId: finalMetaPixelId,
        platforms: campaignData.platforms, // Store the platforms
        /**
         * Storing the full original payload.
         * This makes our service stateless, as every subsequent step (create ad sets, creatives, etc.)
         * can re-read its instructions from this record without needing the data to be passed again.
         */
        originalCampaignData: campaignData,
      });

      this.logger.debug(
        `Created Facebook campaign tracking: ${facebookCampaign._id.toString()}`,
      );
      return facebookCampaign;
    } catch (error) {
      this.logger.error(
        `Failed to create Facebook campaign tracking: ${campaignData.campaignId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update Facebook campaign processing status
   */
  async updateProcessingStatus(
    campaignId: string,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const updateData: any = {
        processingStatus: status,
        lastProcessedAt: new Date(),
      };

      if (errorMessage) {
        updateData.errorMessage = errorMessage;
      }

      await this.facebookCampaignModel.updateOne(
        { campaignId },
        { $set: updateData },
      );

      this.logger.debug(
        `Updated Facebook campaign status: ${campaignId} -> ${status}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update Facebook campaign status: ${campaignId}`,
        error,
      );
      throw error;
    }
  }
}
