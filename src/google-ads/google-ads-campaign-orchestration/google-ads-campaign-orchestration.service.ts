import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleAdsCampaignOrchestrationService {
  async launchCampaign(params: { campaignId: string }) {
    return {
      campaignId: params.campaignId,
    };
  }
}
