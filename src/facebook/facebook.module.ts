import { Module } from '@nestjs/common';
import { FacebookAuthModule } from './facebook-auth/facebook-auth.module';
import { InternalFacebookController } from './controllers/facebook-internal.controller';
import { FacebookCampaignController } from './controllers/facebook-campaign.controller';
import { FacebookCampaignDataService } from './services/facebook-campaign-data.service';
import { FacebookCampaignService } from './services/facebook-campaign.service';
import { FacebookBusinessManagerService } from './services/facebook-business-manager.service';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/auth/auth.service';
import { InternalHttpHelper } from 'src/common/helpers/internal-http.helper';
import { ServiceRegistryService } from 'src/common/services/service-registry.service';
import { FacebookTokenService } from './services/facebook-token.service';

@Module({
  imports: [FacebookAuthModule],
  controllers: [InternalFacebookController, FacebookCampaignController],
  providers: [
    FacebookTokenService,
    FacebookCampaignDataService,
    FacebookCampaignService,
    FacebookBusinessManagerService,
    JwtService,
    AuthService,
    InternalHttpHelper,
    ServiceRegistryService,
  ],
})
export class FacebookModule {}
