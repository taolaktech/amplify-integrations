import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { GoogleAdsService } from './services/google-ads.service';
import { GoogleAdsAuthService } from './services/google-ads-auth.service';

import { GoogleAdsController } from './controllers/google-ads.controller';
import { GoogleAdsAuthController } from './controllers/google-ads-auth.controller';

import { GoogleAdsResourceApiService } from './api/resource-api/resource.api';
import { GoogleAdsSharedMethodsService } from './api/shared';
import { GoogleAdsAuthApiService } from './api/auth-api/auth.api';
import { GoogleAdsCustomerApiService } from './api/customer-api/customer.api';
import { GoogleAdsSearchApiService } from './api/search-api/search-api';

@Module({
  providers: [
    GoogleAdsService,
    GoogleAdsAuthService,
    // google ads api services
    GoogleAdsCustomerApiService,
    GoogleAdsResourceApiService,
    GoogleAdsAuthApiService,
    GoogleAdsSearchApiService,
    GoogleAdsSharedMethodsService,
    JwtService,
  ],
  controllers: [GoogleAdsController, GoogleAdsAuthController],
})
export class GoogleAdsModule {}
