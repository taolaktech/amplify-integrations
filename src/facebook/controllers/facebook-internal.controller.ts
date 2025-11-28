import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FacebookAuthService } from '../facebook-auth/facebook-auth.service';
import { Public } from '../../auth/decorators';
import { AdsInsightsDto, CampaignInsightsDto } from '../dtos/insights.dto';
import { FacebookBusinessManagerService } from '../services/facebook-business-manager.service';

@Public()
@ApiTags('Internal Facebook Campaign Controller')
@Controller('facebook/internal')
export class InternalFacebookController {
  constructor(
    private readonly facebookAuthService: FacebookAuthService,
    private readonly facebookBusinessManager: FacebookBusinessManagerService,
  ) {}

  @Get('users/:userId/primary-ad-account')
  @ApiOperation({
    summary: "Get user's primary ad account for campaign creation",
    description:
      'Used by Lambda functions to get the primary Facebook ad account for campaign creation. Requires API key authentication.',
  })
  @ApiParam({ name: 'userId', description: 'User ID (MongoDB ObjectId)' })
  @ApiResponse({
    status: 200,
    description: 'Primary ad account retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            accountId: { type: 'string', example: 'act_1087932189349950' },
            name: { type: 'string', example: 'My Store Ads' },
            currency: { type: 'string', example: 'USD' },
            integrationStatus: {
              type: 'string',
              example: 'READY_FOR_CAMPAIGNS',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User has no ready ad account for campaigns',
  })
  async getUserPrimaryAdAccountForLambda(@Param('userId') userId: string) {
    // Get user's primary ad account that's ready for campaigns
    const primaryAccount =
      await this.facebookAuthService.getPrimaryAdAccountForCampaigns(userId);

    return {
      success: true,
      data: {
        accountId: primaryAccount.accountId,
        pageId: primaryAccount.pageId,
        metaPixelId: primaryAccount.metaPixelId,
        name: primaryAccount.name,
        currency: primaryAccount.currency,
        integrationStatus: primaryAccount.integrationStatus,
      },
    };
  }

  @Get('users/:userId/primary-instagram-account')
  @ApiOperation({
    summary: 'Get primary Instagram account',
    description: "Retrieves the user's primary Instagram account.",
  })
  @ApiResponse({
    status: 200,
    description: 'Primary Instagram account retrieved successfully',
  })
  async getPrimaryInstagramAccount(@Param('userId') userId: string) {
    const primaryAccount =
      await this.facebookAuthService.getPrimaryInstagramAccount(userId);

    return {
      success: true,
      data: primaryAccount,
      message: 'Primary Instagram account retrieved successfully',
    };
  }

  @Post('ads/insights')
  @ApiOperation({
    summary: 'Get insights from facebook on multiple Ads',
    description: 'Retrieves insights from the adId sent',
  })
  @ApiResponse({
    status: 200,
    description: 'List of Ad insights',
  })
  async retrieveMetaAdInsights(@Body() adInsightsDto: AdsInsightsDto) {
    const adInsightsResponse = await this.facebookBusinessManager.getAdInsights(
      adInsightsDto.adIds,
    );

    return {
      success: true,
      data: adInsightsResponse,
      message: 'Ads Insights successfully fetched',
    };
  }

  @Post('campaign/insights')
  @ApiOperation({
    summary: 'Get insights from facebook on multiple campaigns',
    description: 'Retrieves insights from the campaignIds sent',
  })
  @ApiResponse({
    status: 200,
    description: 'List of Campaign insights',
  })
  async retrieveMetaCampaignInsights(
    @Body() campaignInsightsDto: CampaignInsightsDto,
  ) {
    const adInsightsResponse =
      await this.facebookBusinessManager.getCampaignInsights(
        campaignInsightsDto.campaignIds,
      );

    return {
      success: true,
      data: adInsightsResponse,
      message: 'Campaigns Insights successfully fetched',
    };
  }
}
