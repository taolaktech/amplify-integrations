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
    summary:
      'Google Ads orchestration step 1 (budget + bidding strategy + campaign)',
    description:
      'Idempotently creates budget, target ROAS bidding strategy, and campaign for a given campaignId. Persists state in google-ads-campaigns.',
  })
  @Post('/step-1')
  async step1(@Body() body: { campaignId: string }) {
    return await this.googleAdsCampaignOrchestrationService.step1({
      campaignId: body?.campaignId,
    });
  }

  @ApiOperation({
    summary: 'Google Ads orchestration step 2 (ad group + ads)',
    description:
      'Idempotently creates a single ad group and loads all creatives as responsive search ads into that ad group. Uses state persisted in google-ads-campaigns by step 1.',
  })
  @Post('/step-2')
  async step2(@Body() body: { campaignId: string }) {
    return await this.googleAdsCampaignOrchestrationService.step2({
      campaignId: body?.campaignId,
    });
  }

  @ApiOperation({
    summary: 'Google Ads orchestration step 3 (keywords)',
    description:
      'Idempotently generates keyword ideas and adds keywords to all ad groups. Uses state persisted in google-ads-campaigns by steps 1 & 2.',
  })
  @Post('/step-3')
  async step3(@Body() body: { campaignId: string }) {
    return await this.googleAdsCampaignOrchestrationService.step3({
      campaignId: body?.campaignId,
    });
  }

  @ApiOperation({
    summary: 'Google Ads orchestration step 4 (geo targeting)',
    description:
      'Idempotently adds geo targeting to the Google Ads campaign based on Campaign.location. Uses state persisted in google-ads-campaigns by step 1.',
  })
  @Post('/step-4')
  async step4(@Body() body: { campaignId: string }) {
    return await this.googleAdsCampaignOrchestrationService.step4({
      campaignId: body?.campaignId,
    });
  }

  @ApiOperation({
    summary: 'Google Ads orchestration step 5 (enable campaign)',
    description:
      'Idempotently enables the Google Ads campaign by setting status=ENABLED. Uses state persisted in google-ads-campaigns by step 1.',
  })
  @Post('/step-5')
  async step5(@Body() body: { campaignId: string }) {
    return await this.googleAdsCampaignOrchestrationService.step5({
      campaignId: body?.campaignId,
    });
  }
}
