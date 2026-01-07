import { Module } from '@nestjs/common';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';
import { GoogleAdsCampaignOrchestrationController } from './google-ads-campaign-orchestration.controller';
import { GoogleAdsCampaignOrchestrationService } from './google-ads-campaign-orchestration.service';

@Module({
  providers: [
    GoogleAdsCampaignOrchestrationService,
    InternalHttpHelper,
    ServiceRegistryService,
  ],
  controllers: [GoogleAdsCampaignOrchestrationController],
  exports: [GoogleAdsCampaignOrchestrationService],
})
export class GoogleAdsCampaignOrchestrationModule {}
