import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GoogleAdsService } from './google-ads.service';
import { ApiSecurity } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';
import {
  AddGeotargetingToCampaignDto,
  AddKeywordsToAdGroupDto,
  CreateAdGroupAdDto,
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

  @Post('/create-ad-group-ad')
  async createAdGroupAd(@Body() body: CreateAdGroupAdDto) {
    return await this.googleAdsService.createAdGroupAd(body);
  }

  @Post('/add-keywords-to-ad-group')
  async addKeywordsToAdGroup(@Body() body: AddKeywordsToAdGroupDto) {
    return await this.googleAdsService.addKeywordsToAdGroup(body);
  }

  @Post('/add-geo-targeting-to-campaign')
  async addGeoTargetingToCampaign(@Body() body: AddGeotargetingToCampaignDto) {
    return await this.googleAdsService.addGeoTargetingToCampaign(body);
  }
}
