import { Module } from '@nestjs/common';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';
import { GoogleAdsCampaignOrchestrationController } from './google-ads-campaign-orchestration.controller';
import { GoogleAdsCampaignOrchestrationService } from './google-ads-campaign-orchestration.service';
import { GoogleAdsConnectionTokenService } from '../services/google-ads-connection-token.service';
import { GoogleAdsResourceApiService } from '../api/resource-api/resource.api';
import { GoogleAdsSharedMethodsService } from '../api/shared';
import { GoogleAdsSearchApiService } from '../api/search-api/search-api';

@Module({
  providers: [
    GoogleAdsCampaignOrchestrationService,
    InternalHttpHelper,
    ServiceRegistryService,
    GoogleAdsConnectionTokenService,
    GoogleAdsSharedMethodsService,
    GoogleAdsResourceApiService,
    GoogleAdsSearchApiService,
  ],
  controllers: [GoogleAdsCampaignOrchestrationController],
})
export class GoogleAdsCampaignOrchestrationModule {}
