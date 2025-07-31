import { Module } from '@nestjs/common';
import { GoogleAdsService } from './google-ads.service';
import { GoogleAdsController } from './google-ads.controller';
import { GoogleAdsResourceApiService } from './api/resource-api/resource.api';
import { GoogleAdsSharedMethodsService } from './api/shared';
import { GoogleAdsAuthApiService } from './api/auth-api/auth.api';
import { GoogleAdsCustomerApiService } from './api/customer-api/customer.api';
import { GoogleAdsSearchApiService } from './api/search-api/search-api';

@Module({
  providers: [
    GoogleAdsService,
    GoogleAdsCustomerApiService,
    GoogleAdsResourceApiService,
    GoogleAdsAuthApiService,
    GoogleAdsSearchApiService,
    GoogleAdsSharedMethodsService,
  ],
  controllers: [GoogleAdsController],
})
export class GoogleAdsModule {}
