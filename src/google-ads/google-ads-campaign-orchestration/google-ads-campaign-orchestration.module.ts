import { Module } from '@nestjs/common';
import { GoogleAdsCampaignOrchestrationController } from './google-ads-campaign-orchestration.controller';
import { GoogleAdsCampaignOrchestrationService } from './google-ads-campaign-orchestration.service';

@Module({
  providers: [GoogleAdsCampaignOrchestrationService],
  controllers: [GoogleAdsCampaignOrchestrationController],
  exports: [GoogleAdsCampaignOrchestrationService],
})
export class GoogleAdsCampaignOrchestrationModule {}
