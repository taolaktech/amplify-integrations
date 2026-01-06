import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { GoogleAdsCampaignOrchestrationService } from './google-ads-campaign-orchestration.service';

@ApiSecurity('x-api-key')
@Controller('api/google-ads/campaign-orchestration')
export class GoogleAdsCampaignOrchestrationController {
  constructor(
    private googleAdsCampaignOrchestrationService: GoogleAdsCampaignOrchestrationService,
  ) {}

  @ApiOperation({
    summary: 'Launch Google Ads campaign orchestration',
    description:
      'Triggers server-side orchestration to create/launch a Google Ads campaign for a given campaignId.',
  })
  @Post('/launch')
  async launch(@Body() body: { campaignId: string }) {
    return await this.googleAdsCampaignOrchestrationService.launchCampaign({
      campaignId: body?.campaignId,
    });
  }
}
