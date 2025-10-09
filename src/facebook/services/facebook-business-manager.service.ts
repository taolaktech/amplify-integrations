import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SystemUserAssignmentRequest {
  adAccountId: string;
  permissions: string[];
  // userId: string;
}

export interface PermissionRequestResult {
  success: boolean;
  requestId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message: string;
}

@Injectable()
export class FacebookBusinessManagerService {
  private readonly logger = new Logger(FacebookBusinessManagerService.name);
  private readonly graph: AxiosInstance;
  private readonly systemUserToken: string;
  private readonly systemUserId: string;
  private readonly businessId: string;

  private readonly sandboxAdAccountId: string;

  constructor(private config: ConfigService) {
    this.systemUserToken = this.config.get<string>(
      'FACEBOOK_SYSTEM_USER_TOKEN',
    ) as string;
    this.systemUserId = this.config.get<string>(
      'AMPLIFY_SYSTEM_USER_ID',
    ) as string;
    this.businessId = this.config.get<string>('AMPLIFY_BUSINESS_ID') as string;

    this.sandboxAdAccountId = this.config.get<string>(
      'SANDBOX_AD_ACCOUNT_ID',
    ) as string; //  Load sandbox ID

    this.graph = axios.create({
      baseURL: 'https://graph.facebook.com/v23.0',
      params: {
        access_token: this.systemUserToken,
      },
    });
  }

  // Helper to get the effective Ad Account ID based on environment
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
   * Request system user access to user's ad account
   */
  async requestSystemUserAccess(
    request: SystemUserAssignmentRequest,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.debug(
        `Requesting system user access to ad account: ${request.adAccountId}`,
      );

      // Step 1: Create permission request
      const response = await this.graph.post(
        `/${request.adAccountId}/assigned_users`,
        {
          user: this.systemUserId,
          tasks: request.permissions, // ['MANAGE', 'ADVERTISE', 'ANALYZE']
        },
      );

      this.logger.debug('System user assignment response:', response.data);
      // Facebook returns: { "success": true } on successful assignment
      if (response.data.success) {
        return {
          success: true,
          message: 'System user successfully assigned to ad account',
        };
      } else {
        throw new InternalServerErrorException(
          'Assignment request did not return success',
        );
      }
    } catch (error) {
      this.logger.error('Failed to request system user access', {
        error: error.response?.data,
        adAccountId: request.adAccountId,
        systemUserId: this.systemUserId,
      });

      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message;

      if (errorCode === 100) {
        throw new BadRequestException(
          `Invalid system user ID or ad account format: ${errorMessage}`,
        );
      }

      if (errorCode === 190) {
        throw new UnauthorizedException(
          `Invalid system user token: ${errorMessage}`,
        );
      }

      if (errorCode === 200) {
        throw new BadRequestException(
          'Insufficient permissions to assign users to this ad account',
        );
      }

      throw new InternalServerErrorException(
        `Failed to request system user access: ${errorMessage}`,
      );
    }
  }

  /**
   * Check the status of system user permissions
   */
  async checkSystemUserAssignment(adAccountId: string): Promise<{
    isAssigned: boolean;
    grantedTasks: string[];
    systemUserDetails?: any;
  }> {
    try {
      const response = await this.graph.get(`/${adAccountId}/assigned_users`, {
        params: {
          // fields: 'id,name,email,tasks,status',
          business: this.businessId,
        },
      });

      const users = response.data.data || [];

      // Find our system user by ID
      // Note: System users might appear with different ID formats in responses
      const systemUser = users.find((user: any) => {
        // System users might have different ID representation
        return (
          user.id === this.systemUserId ||
          user.id.toString() === this.systemUserId.toString()
        );
      });
      if (systemUser) {
        this.logger.debug(`System user found in ad account ${adAccountId}:`, {
          id: systemUser.id,
          name: systemUser.name,
          tasks: systemUser.tasks,
        });

        return {
          isAssigned: true,
          grantedTasks: systemUser.tasks || [],
          systemUserDetails: systemUser,
        };
      } else {
        this.logger.debug(
          `System user ${this.systemUserId} not found in ad account ${adAccountId}`,
        );
        return {
          isAssigned: false,
          grantedTasks: [],
        };
      }
    } catch (error) {
      this.logger.error(
        'Failed to check system user assignment',
        error.response?.data,
      );

      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message;

      if (errorCode === 190) {
        throw new UnauthorizedException(
          `Invalid system user token: ${errorMessage}`,
        );
      }

      if (errorCode === 200) {
        throw new BadRequestException(
          `Insufficient permissions to check ad account users: ${errorMessage}`,
        );
      }

      throw new InternalServerErrorException(
        `Failed to check system user assignment: ${errorMessage}`,
      );
    }
  }

  /**
   * Get system user capabilities for an ad account
   */
  async getSystemUserCapabilities(adAccountId: string): Promise<{
    canCreateCampaigns: boolean;
    canManageAds: boolean;
    canViewInsights: boolean;
    grantedTasks: string[];
    missingTasks: string[];
  }> {
    try {
      const assignment = await this.checkSystemUserAssignment(adAccountId);

      if (!assignment.isAssigned) {
        return {
          canCreateCampaigns: false,
          canManageAds: false,
          canViewInsights: false,
          grantedTasks: [],
          missingTasks: ['MANAGE', 'ADVERTISE', 'ANALYZE'],
        };
      }

      const grantedTasks = assignment.grantedTasks;
      const requiredTasks = ['MANAGE', 'ADVERTISE', 'ANALYZE'];
      const missingTasks = requiredTasks.filter(
        (task) => !grantedTasks.includes(task),
      );

      return {
        canCreateCampaigns:
          grantedTasks.includes('ADVERTISE') && grantedTasks.includes('MANAGE'),
        canManageAds: grantedTasks.includes('MANAGE'),
        canViewInsights: grantedTasks.includes('ANALYZE'),
        grantedTasks,
        missingTasks,
      };
    } catch (error) {
      this.logger.error('Failed to get system user capabilities', error);
      return {
        canCreateCampaigns: false,
        canManageAds: false,
        canViewInsights: false,
        grantedTasks: [],
        missingTasks: ['MANAGE', 'ADVERTISE', 'ANALYZE'],
      };
    }
  }

  /**
   * Remove system user access from ad account
   */
  async removeSystemUserAccess(adAccountId: string): Promise<void> {
    try {
      const response = await this.graph.delete(
        `/${adAccountId}/assigned_users`,
        {
          data: {
            user: this.systemUserId,
          },
        },
      );

      this.logger.debug(
        `System user removed from ad account ${adAccountId}:`,
        response.data,
      );

      if (!response.data.success) {
        throw new InternalServerErrorException(
          'Remove operation did not return success',
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to remove system user access',
        error.response?.data,
      );

      const errorMessage = error.response?.data?.error?.message;
      throw new InternalServerErrorException(
        `Failed to remove system user access: ${errorMessage}`,
      );
    }
  }

  /**
   * Creates a new Ad Set within a campaign.
   */
  async createAdSet(
    adAccountId: string,
    campaignId: string,
    name: string,
    dailyBudget: number,
    targeting: any,
    userMetaPixelId: string,
    startDate: string,
    endDate: string,
  ): Promise<any> {
    try {
      // adAccountId = this.getEffectiveAdAccountId(adAccountId);

      this.logger.debug(
        `Creating ad set '${name}' with budget ${dailyBudget} cents`,
      );
      console.log(`===== ${JSON.stringify(targeting, null, 2)}`);
      // throw Error('yamutu');
      const response = await this.graph.post(`/${adAccountId}/adsets`, {
        campaign_id: campaignId,
        name,
        daily_budget: dailyBudget, // Budget is in cents
        billing_event: 'IMPRESSIONS',
        optimization_goal: 'OFFSITE_CONVERSIONS',
        promoted_object: {
          pixel_id: userMetaPixelId ?? '762705843063326',
          custom_event_type: 'PURCHASE', // Optimize for sales
        },
        targeting,
        status: 'PAUSED',
        //  Explicitly set bid_strategy to LOWEST_COST_WITHOUT_CAP
        // This tells Facebook to get the most conversions for the budget automatically.
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        // No bid_amount is needed with LOWEST_COST_WITHOUT_CAP
        // tells facebook this Ad set is configured to handle dynamic creative
        is_dynamic_creative: true,
        start_time: startDate,
        end_time: endDate,
      });
      return response.data;
    } catch (error) {
      this.logger.error(
        'Facebook API Error: Failed to create ad set',
        error.response?.data,
      );
      throw new InternalServerErrorException(
        `Facebook API Error: ${error.response?.data?.error?.message}`,
      );
    }
  }

  /**
   * @deprecated
   * Creates a single "Flexible" (Advantage+ Creative) ad creative.
   * This involves uploading all images to get their hashes, then creating
   * a single creative with an asset_feed_spec.
   */
  async createFlexibleAdCreative(
    adAccountId: string,
    name: string,
    assets: {
      imageUrls: string[];
      bodies: string[];
      titles: string[];
      descriptions: string[];
      linkUrls: string[];
      callToAction: string;
    },
  ): Promise<any> {
    try {
      // adAccountId = this.getEffectiveAdAccountId(adAccountId);

      this.logger.debug(`Creating flexible creative '${name}'`);

      // Step 1: Upload all unique images in parallel to get their hashes
      this.logger.debug(`Uploading ${assets.imageUrls.length} images...`);
      const imageUploadPromises = assets.imageUrls.map((url) =>
        this.graph.post(`/${adAccountId}/adimages`, { url }),
      );
      const imageUploadResults = await Promise.all(imageUploadPromises);

      const imageHashes = imageUploadResults.map(
        (res, index) => res.data.images[assets.imageUrls[index]].hash,
      );
      this.logger.debug(
        `All images uploaded successfully. Hashes:`,
        imageHashes,
      );

      // Step 2: Build the asset_feed_spec
      const assetFeedSpec = {
        images: imageHashes.map((hash) => ({ image_hash: hash })),
        bodies: assets.bodies.map((text) => ({ text })),
        titles: assets.titles.map((text) => ({ text })),
        descriptions: assets.descriptions.map((text) => ({ text })),
        link_urls: assets.linkUrls.map((url) => ({ website_url: url })),
        call_to_action_types: [assets.callToAction],
      };

      // Step 3: Create the ad creative with the asset_feed_spec
      const creativeResponse = await this.graph.post(
        `/${adAccountId}/adcreatives`,
        {
          name,
          asset_feed_spec: assetFeedSpec,
          // We do NOT set is_dynamic_creative=true. Using asset_feed_spec implies
          // the modern Advantage+ Creative format for sales campaigns.
        },
      );

      return creativeResponse.data;
    } catch (error) {
      this.logger.error(
        'Facebook API Error: Failed to create flexible creative',
        error.response?.data,
      );
      throw new InternalServerErrorException(
        `Facebook API Error: ${error.response?.data?.error?.message}`,
      );
    }
  }

  /**
   * Uploads an image from a URL and returns its hash.
   * @see https://developers.facebook.com/docs/marketing-api/reference/ad-account/adimages/#Creating
   */
  async uploadImageByUrl(
    adAccountId: string,
    imageDataOrUrl: string,
  ): Promise<{ hash: string; url: string }> {
    // adAccountId = this.getEffectiveAdAccountId(adAccountId);

    this.logger.debug(`Uploading image from URL: ${imageDataOrUrl}`);
    let base64Image: string;
    let originalSourceUrl: string | null = null;
    try {
      // Auto-detect if input is Base64 or a URL
      if (
        imageDataOrUrl.startsWith('data:image/') &&
        imageDataOrUrl.includes(';base64,')
      ) {
        this.logger.debug('Detected Base64 image data directly.');
        base64Image = imageDataOrUrl.split(';base64,')[1]; // Extract actual base64 part
      } else if (
        imageDataOrUrl.startsWith('http://') ||
        imageDataOrUrl.startsWith('https://')
      ) {
        this.logger.debug(
          `Detected image URL. Fetching from: ${imageDataOrUrl}`,
        );
        originalSourceUrl = imageDataOrUrl;
        const imageBuffer = await this.fetchImageBufferFromUrl(imageDataOrUrl);
        base64Image = imageBuffer.toString('base64');
      } else {
        throw new BadRequestException(
          'Invalid image input: Must be a valid URL or Base64 string.',
        );
      }

      const response = await this.graph.post(`/${adAccountId}/adimages`, {
        bytes: base64Image,
      });
      this.logger.debug('Successfully uploaded images', {
        response: response.data,
      });
      // The response structure might be a map, so we extract the first image's hash
      const imageKey = Object.keys(response.data.images)[0];
      const imageHash = response.data.images[imageKey].hash;
      const facebookImageUrl = response.data.images[imageKey].url; // Facebook's own URL for the image

      this.logger.debug(
        `Image ${imageDataOrUrl} uploaded successfully, hash: ${imageHash}, Facebook URL: ${facebookImageUrl}`,
      );
      return { hash: imageHash, url: facebookImageUrl }; // Return Facebook's URL
    } catch (error) {
      this.logger.error(
        `Facebook API Error: Failed to upload image. Source: ${originalSourceUrl || 'Base64'}`,
        error.response?.data || error.message,
      );
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        'An unknown error occurred during image upload.';
      throw new InternalServerErrorException(
        `Facebook API Error: Failed to upload image. ${errorMessage}`,
      );
    }
  }

  /**
   * Helper to fetch an image from a URL as a Buffer.
   */
  private async fetchImageBufferFromUrl(url: string): Promise<Buffer> {
    try {
      this.logger.debug(`Fetching image from external URL: ${url}`);

      const response = await axios.get(url, {
        responseType: 'arraybuffer', // Crucial for binary data
        timeout: 10000, // Add a timeout to prevent hanging requests
      });

      if (response.status === 200 && response.data) {
        this.logger.debug(`Successfully fetched image from ${url}`);
        return Buffer.from(response.data);
      } else {
        throw new Error(
          `Failed to fetch image from ${url}. Status: ${response.status}`,
        );
      }
    } catch (error) {
      // Axios errors have a specific structure
      if (axios.isAxiosError(error)) {
        this.logger.error(`Axios error fetching image from ${url}:`, {
          status: error.response?.status,
          message: error.message,
          code: error.code,
        });
        throw new InternalServerErrorException(
          `Network error fetching image from ${url}: ${error.message}`,
        );
      } else {
        this.logger.error(
          `Unknown error fetching image from ${url}: ${error.message || error}`,
        );
        throw new InternalServerErrorException(
          `Unknown error fetching image from ${url}.`,
        );
      }
    }
  }

  /**
   * Creates a single "flexible" ad creative using asset_feed_spec.
   */
  async createFlexibleCreative(
    adAccountId: string,
    name: string,
    assetFeedSpec: any,
    pageId: string,
    instagramAccountId?: string, // optional parameter
  ): Promise<any> {
    try {
      this.logger.debug(`Creating flexible creative '${name}'`);

      const nodeEnv = process.env.NODE_ENV || 'development';
      const creativePayload: any = { name };

      if (nodeEnv === 'development') {
        this.logger.debug(
          'In development mode, creating creative from existing post ID.',
        );
        if (instagramAccountId) {
          // For Instagram dev campaigns, use the provided ID of a manually created Instagram post.
          this.logger.debug('Using Instagram post ID for creative.');
          creativePayload.source_instagram_media_id = '18069086954226562';
          creativePayload.page_id = pageId;
          creativePayload.instagram_user_id = instagramAccountId;
        } else {
          // For Facebook-only dev campaigns, use the existing hardcoded Page post ID.
          this.logger.debug('Using Facebook Page post ID for creative.');
          creativePayload.object_story_id =
            '712111348642385_122138947832873268';
        }
      } else {
        // For production, build the creative from scratch using the asset feed and object story spec.
        this.logger.debug('In production mode, creating creative from spec.');
        const objectStorySpec: Record<string, any> = {
          page_id: pageId,
        };

        if (instagramAccountId) {
          objectStorySpec.instagram_user_id = instagramAccountId;
        }
        creativePayload.asset_feed_spec = assetFeedSpec;
        creativePayload.object_story_spec = objectStorySpec;
      }

      this.logger.debug('Creative Payload:', creativePayload);

      const response = await this.graph.post(
        `/${adAccountId}/adcreatives`,
        creativePayload,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        'Facebook API Error: Failed to create flexible creative',
        error.response?.data,
      );
      throw new InternalServerErrorException(
        `Facebook API Error: ${error.response?.data?.error?.message}`,
      );
    }
  }

  /**
   * Creates a single "flexible" ad creative using asset_feed_spec.
   */
  // async createFlexibleCreative(
  //   adAccountId: string,
  //   name: string,
  //   assetFeedSpec: any,
  //   pageId: string,
  //   instagramAccountId?: string, // optional parameter
  // ): Promise<any> {
  //   try {
  //     // adAccountId = this.getEffectiveAdAccountId(adAccountId);

  //     const nodeEnv = process.env.NODE_ENV || 'development';

  //     // let creativePayload: any;

  //     // if (nodeEnv === 'development' || nodeEnv === 'test') {
  //     //   // Simplified payload for sandbox - no object_story_spec
  //     //   creativePayload = {
  //     //     name,
  //     //     asset_feed_spec: assetFeedSpec,
  //     //   };
  //     // } else {
  //     //   // Full payload for production
  //     //   const objectStorySpec: Record<string, any> = {
  //     //     page_id: pageId,
  //     //   };

  //     //   if (instagramAccountId) {
  //     //     objectStorySpec.instagram_user_id = instagramAccountId;
  //     //   }

  //     //   creativePayload = {
  //     //     name,
  //     //     asset_feed_spec: assetFeedSpec,
  //     //     object_story_spec: objectStorySpec,
  //     //   };
  //     // }

  //     this.logger.debug(`Creating flexible creative '${name}'`);
  //     const objectStorySpec: Record<string, any> = {
  //       page_id: pageId,
  //     };

  //     if (instagramAccountId) {
  //       objectStorySpec.instagram_user_id = instagramAccountId;
  //     }

  //     const response = await this.graph.post(`/${adAccountId}/adcreatives`, {
  //       name,
  //       asset_feed_spec: assetFeedSpec,
  //       ...(nodeEnv === 'development' && !instagramAccountId
  //         ? {
  //             object_story_id: '712111348642385_122138947832873268',
  //           }
  //         : {
  //             object_story_spec: objectStorySpec,
  //           }),

  //       // object_story_spec: objectStorySpec,
  //       // ...creativePayload,
  //     });
  //     return response.data;
  //   } catch (error) {
  //     this.logger.error(
  //       'Facebook API Error: Failed to create flexible creative',
  //       error.response?.data,
  //     );
  //     throw new InternalServerErrorException(
  //       `Facebook API Error: ${error.response?.data?.error?.message}`,
  //     );
  //   }
  // }

  /**
   * Creates an Ad by linking an Ad Set and a Creative.
   * This is the missing method.
   * @param adAccountId The ad account ID to create the ad in.
   * @param adSetId The ID of the ad set this ad will belong to.
   * @param creativeId The ID of the creative to be used for this ad.
   * @param name The name of the ad.
   * @returns The response from the Facebook Graph API.
   */
  async createAd(
    adAccountId: string,
    adSetId: string,
    creativeId: string,
    name: string,
  ): Promise<any> {
    try {
      // adAccountId = this.getEffectiveAdAccountId(adAccountId);

      this.logger.debug(
        `Creating ad '${name}' in Ad Set ${adSetId} with Creative ${creativeId}`,
      );

      const response = await this.graph.post(`/${adAccountId}/ads`, {
        name,
        adset_id: adSetId,
        creative: {
          creative_id: creativeId,
        },
        status: 'PAUSED', // Create the ad in a paused state, it will be activated during the launch step
      });

      this.logger.debug(
        `Ad '${name}' created successfully with ID: ${response.data.id}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Facebook API Error: Failed to create ad '${name}'`,
        error.response?.data,
      );
      throw new InternalServerErrorException(
        `Facebook API Error: ${error.response?.data?.error?.message}`,
      );
    }
  }

  /**
   * Activates or Pauses a campaign component (Campaign, Ad Set, or Ad).
   * @param componentId The ID of the campaign, ad set, or ad.
   * @param status The desired status: 'ACTIVE' or 'PAUSED'.
   * @returns A boolean indicating success.
   */
  async updateStatus(
    componentId: string,
    status: 'ACTIVE' | 'PAUSED',
  ): Promise<boolean> {
    try {
      this.logger.debug(
        `Updating status of component ${componentId} to ${status}`,
      );
      const response = await this.graph.post(`/${componentId}`, {
        status,
      });

      if (response.data.success) {
        this.logger.debug(`Successfully updated status for ${componentId}.`);
      } else {
        this.logger.warn(
          `Status update for ${componentId} did not report success.`,
          response.data,
        );
      }

      return response.data.success;
    } catch (error) {
      this.logger.error(
        `Facebook API Error: Failed to update status for ${componentId}`,
        error.response?.data,
      );
      throw new InternalServerErrorException(
        `Facebook API Error: Failed to update status for ${componentId}. ${error.response?.data?.error?.message}`,
      );
    }
  }

  /**
   * Creates the main campaign container in Facebook.
   * This is the missing method.
   * @param adAccountId The ad account ID to create the campaign in.
   * @param name The name of the campaign.
   * @returns The response from the Facebook Graph API, containing the new campaign's ID.
   */
  async createCampaign(
    adAccountId: string,
    name: string,
  ): Promise<{ id: string; [key: string]: any }> {
    try {
      // adAccountId = this.getEffectiveAdAccountId(adAccountId);

      this.logger.debug(
        `Creating Facebook campaign '${name}' in ad account ${adAccountId}`,
      );

      const response = await this.graph.post(`/${adAccountId}/campaigns`, {
        name,
        objective: 'OUTCOME_SALES', // As per Miro notes for e-commerce simplicity
        status: 'PAUSED', // Always create campaigns in a paused state. We activate them in the final "launch" step.
        special_ad_categories: [], // Assuming we are not dealing with special categories like credit, housing, etc.
      });

      this.logger.debug(
        `Campaign '${name}' created successfully on Facebook with ID: ${response.data.id}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Facebook API Error: Failed to create campaign '${name}'`,
        error.response?.data,
      );
      // We extract the specific error message from Facebook's response for better debugging
      const errorMessage =
        error.response?.data?.error?.message || 'An unknown error occurred';
      throw new InternalServerErrorException(
        `Facebook API Error: ${errorMessage}`,
      );
    }
  }
}
