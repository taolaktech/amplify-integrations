import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GoogleAdsService } from './google-ads.service';
import { ApiSecurity } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';
import {
  CreateAdGroupDto,
  CreateBudgetDto,
  CreateSearchCampaignDto,
} from './dto';

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

  @Post('/create-budget')
  async createBudget(@Body() body: CreateBudgetDto) {
    return await this.googleAdsService.createBudget(body);
  }

  @Post('/create-search-campaign')
  async createSearchCampaign(@Body() body: CreateSearchCampaignDto) {
    return await this.googleAdsService.createSearchCampaign(body);
  }

  @Post('/create-ad-group')
  async createAdGroup(@Body() body: CreateAdGroupDto) {
    return await this.googleAdsService.createAdGroup(body);
  }
}
