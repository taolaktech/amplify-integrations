import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
import { TokenAuthGuard } from 'src/auth/token-auth.guard';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';

import { GoogleAdsService } from './services/deprecated__google-ads.service';
import { GoogleAdsAuthService } from './services/google-ads-auth.service';
import { GoogleAdsCustomersService } from './services/google-ads-customers.service';
import { GoogleAdsConnectionTokenService } from './services/google-ads-connection-token.service';

import { GoogleAdsAuthController } from './controllers/google-ads-auth.controller';
import { GoogleAdsCustomersController } from './controllers/google-ads-customers.controller';

import { GoogleAdsResourceApiService } from './api/resource-api/resource.api';
import { GoogleAdsSharedMethodsService } from './api/shared';
import { GoogleAdsAuthApiService } from './api/auth-api/auth.api';
import { GoogleAdsCustomerApiService } from './api/customer-api/customer.api';
import { GoogleAdsSearchApiService } from './api/search-api/search-api';
import { GoogleAdsCampaignOrchestrationModule } from './campaign-orchestration/google-ads-campaign-orchestration.module';

@Module({
  imports: [GoogleAdsCampaignOrchestrationModule],
  providers: [
    GoogleAdsService,
    GoogleAdsAuthService,
    GoogleAdsCustomersService,
    GoogleAdsConnectionTokenService,

    TokenAuthGuard,
    AuthService,
    InternalHttpHelper,
    ServiceRegistryService,

    // google ads api services
    GoogleAdsCustomerApiService,
    GoogleAdsResourceApiService,
    GoogleAdsAuthApiService,
    GoogleAdsSearchApiService,
    GoogleAdsSharedMethodsService,
    JwtService,
  ],
  controllers: [GoogleAdsAuthController, GoogleAdsCustomersController],
})
export class GoogleAdsModule {}
