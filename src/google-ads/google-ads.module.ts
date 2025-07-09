import { Module } from '@nestjs/common';
import { GoogleAdsService } from './google-ads.service';
import { GoogleAdsController } from './google-ads.controller';
import { GoogleAdsApi } from './google-ads.api';

@Module({
  providers: [GoogleAdsService, GoogleAdsApi],
  controllers: [GoogleAdsController],
})
export class GoogleAdsModule {}
