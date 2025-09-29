import { Module } from '@nestjs/common';
import { FacebookAuthModule } from './facebook-auth/facebook-auth.module';
import { InternalFacebookController } from './controllers/facebook-internal.controller';
import { FacebookCampaignController } from './controllers/facebook-campaign.controller';
import { FacebookCampaignDataService } from './services/facebook-campaign-data.service';
import { FacebookCampaignService } from './services/facebook-campaign.service';
import { FacebookBusinessManagerService } from './services/facebook-business-manager.service';

@Module({
  imports: [FacebookAuthModule],
  controllers: [InternalFacebookController, FacebookCampaignController],
  providers: [
    FacebookCampaignDataService,
    FacebookCampaignService,
    FacebookBusinessManagerService,
  ],
})
export class FacebookModule {}
