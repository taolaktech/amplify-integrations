import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FacebookAuthService } from '../facebook-auth/facebook-auth.service';
import { Public } from '../../auth/decorators';

@Public()
@ApiTags('Internal Facebook Campaign Controller')
@Controller('facebook/internal')
export class InternalFacebookController {
  constructor(private readonly facebookAuthService: FacebookAuthService) {}

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
}
