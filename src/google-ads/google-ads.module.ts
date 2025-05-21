import { Module } from '@nestjs/common';
import { GoogleAdsService } from './google-ads.service';
import { GoogleAdsController } from './google-ads.controller';

@Module({
  providers: [GoogleAdsService],
  controllers: [GoogleAdsController],
})
export class GoogleAdsModule {}
