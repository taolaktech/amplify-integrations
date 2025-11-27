import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FacebookCampaignService } from '../services/facebook-campaign.service';
import {
  FacebookCampaignDataService,
  // CampaignDataFromLambda,
} from '../services/facebook-campaign-data.service';
import { RetryStepDto } from '../dtos/retry-step.dto';
import { Public } from '../../auth/decorators';
import { InitializeCampaignDto } from '../dtos/campaign.dto';
import { FacebookAuthService } from '../facebook-auth/facebook-auth.service';

// DTOs for request/response
// export class InitializeCampaignDto {
//   campaignData: CampaignDataFromLambda;
//   userAdAccountId: string;
// }

export class CampaignStepResponse {
  success: boolean;
  currentStep: string;
  nextStep?: string | null;
  facebookCampaignId?: string;
  data?: any;
  message: string;
}

@Public()
@ApiTags('Facebook Campaign Creation')
@Controller('facebook-campaigns')
export class FacebookCampaignController {
  private readonly logger = new Logger(FacebookCampaignController.name);

  constructor(
    private readonly facebookCampaignService: FacebookCampaignService,
    private readonly facebookCampaignDataService: FacebookCampaignDataService,
    private readonly facebookAuthService: FacebookAuthService,
  ) {}

  @Post('initialize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Initialize Facebook campaign creation',
    description:
      'Creates the main Facebook campaign structure. This is step 1 of the campaign creation process.',
  })
  @ApiResponse({
    status: 200,
    description: 'Campaign initialization started successfully',
    type: CampaignStepResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid campaign data or user ad account not ready',
  })
  async initializeCampaign(
    @Body() dto: InitializeCampaignDto,
  ): Promise<CampaignStepResponse> {
    this.logger.debug(
      `Initializing Facebook campaign: ${dto.campaignData.campaignId}`,
    );

    const platform = dto.campaignData.platforms[0];

    // Validate that the user has the required platforms integrated
    if (dto.campaignData.platforms.includes('INSTAGRAM')) {
      const instagramSetup =
        await this.facebookAuthService.getInstagramSetupStatus(
          dto.campaignData.userId,
        );
      if (!instagramSetup.hasInstagramAccounts) {
        throw new BadRequestException(
          'User has no Instagram accounts connected. Please connect an Instagram account first.',
        );
      }
    }

    if (dto.campaignData.platforms.includes('FACEBOOK')) {
      const primaryAdAccount =
        await this.facebookAuthService.getPrimaryAdAccountForCampaigns(
          dto.campaignData.userId,
        );
      if (!primaryAdAccount) {
        throw new BadRequestException(
          'User has no primary Facebook ad account. Please select an ad account first.',
        );
      }
    }

    // Step 1: Get or create the Facebook campaign tracking document in our DB.
    // This is idempotent and safe to call multiple times.
    let facebookCampaignDocument: Awaited<
      ReturnType<
        typeof this.facebookCampaignDataService.createFacebookCampaignFromLambda
      >
    >;

    if (platform.toLowerCase() == 'instagram') {
      facebookCampaignDocument =
        await this.facebookCampaignDataService.createFacebookCampaignFromLambda(
          dto.campaignData,
          platform,
          dto.userAdAccountId,
          dto.instagramAccountId,
        );
    } else {
      facebookCampaignDocument =
        await this.facebookCampaignDataService.createFacebookCampaignFromLambda(
          dto.campaignData,
          platform,
          dto.userAdAccountId,
        );
    }

    // Step 2: Call the service to perform the actual Facebook API interaction.
    // This will create the campaign on Facebook's side.
    const result =
      await this.facebookCampaignService.initializeFacebookCampaign(
        dto.campaignData,
        facebookCampaignDocument, // Pass the MongoDB document
        platform,
      );

    return {
      success: true,
      currentStep: 'INITIALIZED',
      nextStep: 'CREATE_ADSETS', // Inform the Lambda what to call next
      facebookCampaignId: result.facebookCampaignId,
      message:
        'Facebook campaign initialized successfully. Ready to create ad sets.',
      data: {
        campaignId: dto.campaignData.campaignId,
        facebookCampaignId: result.facebookCampaignId,
        facebookCampaignName: result.facebookCampaignName,
      },
    };
  }

  @Post(':campaignId/create-adsets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create Facebook Ad Sets',
    description:
      'Creates a single Ad Set for the campaign, using the allocated budget and targeting from campaign data. This is step 2.',
  })
  @ApiParam({ name: 'campaignId', description: 'Amplify Campaign ID' })
  @ApiResponse({
    status: 200,
    description: 'Ad Set created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        currentStep: { type: 'string', example: 'ADSETS_CREATED' },
        nextStep: { type: 'string', example: 'CREATE_CREATIVES' },
        message: { type: 'string', example: 'Created 1 ad set successfully' },
        data: {
          type: 'object',
          properties: {
            adSetsCreated: { type: 'number', example: 1 },
            adSetIds: {
              type: 'array',
              items: { type: 'string' },
              example: ['fb_adset_123'],
            },
            adSetName: {
              type: 'string',
              example: 'Amplify AdSet - Product Launch - campaign_id_here',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (e.g., campaign not initialized, invalid data)',
  })
  @ApiResponse({
    status: 404,
    description: 'Facebook campaign tracking document not found',
  })
  async createAdSets(
    @Param('campaignId') campaignId: string,
    //query for platform
    @Query('platform') platform: string,
  ): Promise<CampaignStepResponse> {
    this.logger.debug(
      `Received request to create Ad Sets for Amplify campaign: ${campaignId}`,
    );

    // Call the service to create the Ad Set on Facebook
    const result = await this.facebookCampaignService.createAdSets(
      campaignId,
      platform,
    );

    return {
      success: true,
      currentStep: 'ADSETS_CREATED',
      nextStep: 'CREATE_CREATIVES', // Inform Lambda what to call next
      message: `Created ${result.adSetsCreated} ad set successfully`,
      data: {
        adSetsCreated: result.adSetsCreated,
        adSetIds: result.adSetIds,
        adSetName: result.adSetName,
      },
    };
  }

  @Post(':campaignId/create-creatives')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create a single Flexible Ad Creative',
    description:
      'Collects all assets (images, text, etc.) from the campaign and creates a single dynamic/flexible creative asset on Facebook. This is step 3.',
  })
  @ApiParam({ name: 'campaignId', description: 'Amplify Campaign ID' })
  async createCreatives(
    @Param('campaignId') campaignId: string,
    //query for platform
    @Query('platform') platform: string,
  ): Promise<CampaignStepResponse> {
    this.logger.debug(
      `Received request to create creatives for campaign: ${campaignId}`,
    );

    // This service method now handles the creation of a single flexible creative.
    const result = await this.facebookCampaignService.createCreatives(
      campaignId,
      platform,
    );

    return {
      success: true,
      currentStep: 'CREATIVES_CREATED',
      nextStep: 'CREATE_ADS', // Inform the Lambda what to call next
      message: `Successfully created ${result.creativesCreated} flexible creative asset(s). Ready to create ad.`,
      data: {
        creativesCreated: result.creativesCreated,
        creativeIds: result.creativeIds,
      },
    };
  }

  @Post(':campaignId/create-ads')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create Facebook Ads',
    description:
      'Creates individual ads linking creatives to ad sets. This is step 4 of the campaign creation process.',
  })
  async createAds(
    @Param('campaignId') campaignId: string,
    //query for platform
    @Query('platform') platform: string,
  ): Promise<CampaignStepResponse> {
    this.logger.debug(
      `Received request to create ads for campaign: ${campaignId}`,
    );

    // This service method now handles the creation of the single ad.
    const result = await this.facebookCampaignService.createAds(
      campaignId,
      platform,
    );

    return {
      success: true,
      currentStep: 'ADS_CREATED',
      nextStep: 'LAUNCH', // Inform the Lambda what to call next
      message: `Successfully created ${result.adsCreated} ad(s). Ready to launch.`,
      data: {
        adsCreated: result.adsCreated,
        adIds: result.adIds,
      },
    };
  }

  @Post(':campaignId/launch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Launch Facebook Campaign',
    description:
      'Submits the campaign for Facebook review and activates it. This is the final step.',
  })
  async launchCampaign(
    @Param('campaignId') campaignId: string,
    //query for platform
    @Query('platform') platform: string,
  ): Promise<CampaignStepResponse> {
    this.logger.debug(`Received request to launch campaign: ${campaignId}`);

    // This service method now handles activating all components.
    const result = await this.facebookCampaignService.launchCampaign(
      campaignId,
      platform,
    );

    return {
      success: true,
      currentStep: 'LAUNCHED',
      nextStep: null, // This is the final step in the creation process
      message:
        'Campaign launched successfully and submitted for Facebook review.',
      data: {
        facebookStatus: result.facebookStatus,
        reviewStatus: result.reviewStatus,
        estimatedReviewTime: 'Up to 24 hours, but often much faster.',
      },
    };
  }

  @Get(':campaignId/status')
  @ApiOperation({
    summary: 'Get campaign creation status',
    description:
      'Returns the current step and status of the campaign creation process. Useful for polling and orchestration.',
  })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully.' })
  @ApiResponse({ status: 404, description: 'Campaign not found.' })
  async getCampaignStatus(
    @Param('campaignId') campaignId: string,
    //query for platform
    @Query('platform') platform: string,
  ) {
    this.logger.debug(`Received request for status of campaign: ${campaignId}`);

    const status = await this.facebookCampaignService.getCampaignStatus(
      campaignId,
      platform,
    );

    return {
      success: true,
      message: 'Campaign status retrieved successfully.',
      data: status,
    };
  }

  @Post(':campaignId/retry-step')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry a failed campaign creation step',
    description:
      'If a step in the creation process fails, this endpoint allows the orchestrator (Lambda) to retry it.',
  })
  @ApiResponse({
    status: 200,
    description: 'The step was retried successfully.',
    type: CampaignStepResponse,
  })
  @ApiResponse({
    status: 400,
    description:
      'The step is not in a retryable state or the retry limit was exceeded.',
  })
  @ApiResponse({ status: 404, description: 'Campaign not found.' })
  async retryFailedStep(
    @Param('campaignId') campaignId: string,
    @Body() body: RetryStepDto,
    //query for platform
    @Query('platform') platform: string,
  ): Promise<CampaignStepResponse> {
    this.logger.debug(
      `Received request to retry step '${body.step}' for campaign: ${campaignId}`,
    );

    // The service method handles the logic of re-running the specific step.
    const result = await this.facebookCampaignService.retryStep(
      campaignId,
      body.step,
      platform,
    );

    return {
      success: true,
      currentStep: result.completedStep,
      nextStep: result.nextStep,
      message: `Step '${body.step}' was retried successfully.`,
      data: result.data,
    };
  }
}
