import { Controller, Get, Query } from '@nestjs/common';
import { GoogleAdsService } from './google-ads.service';
import { ApiSecurity } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';

@ApiSecurity('x-api-key')
@Controller('api/google-ads')
export class GoogleAdsController {
  constructor(private googleAdsService: GoogleAdsService) {}

  @Get('/auth/url')
  getAuthUrl() {
    const url = this.googleAdsService.getGoogleAuthUrl();
    return { url };
  }

  @Public()
  @Get('/auth/redirect')
  async googleAuthCallback(@Query() q: any) {
    return await this.googleAdsService.googleAuthCallbackHandler(q);
  }
}
