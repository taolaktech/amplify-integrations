import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GoogleAdsService } from './google-ads.service';
import { ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';
import {
  AddGeotargetingToCampaignDto,
  AddKeywordsToAdGroupDto,
  CreateAdGroupAdDto,
  CreateAdGroupDto,
  CreateBudgetDto,
  CreateSearchCampaignDto,
  UpdateCampaignDto,
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
  async googleAuthCallback(@Query() q: { [k: string]: string }) {
    return await this.googleAdsService.googleAuthCallbackHandler(q);
  }

  @Post('/create-budget')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createBudget(
    @Body() dto: CreateBudgetDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createBudget(dto, { validateOnly });
  }

  @Post('/create-search-campaign')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createSearchCampaign(
    @Body() dto: CreateSearchCampaignDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createSearchCampaign(dto, {
      validateOnly,
    });
  }

  @Post('/create-ad-group')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createAdGroup(
    @Body() dto: CreateAdGroupDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createAdGroup(dto, { validateOnly });
  }

  @Post('/create-ad-group-ad')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createAdGroupAd(
    @Body() dto: CreateAdGroupAdDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createAdGroupAd(dto, { validateOnly });
  }

  @Post('/add-keywords-to-ad-group')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async addKeywordsToAdGroup(
    @Body() dto: AddKeywordsToAdGroupDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.addKeywordsToAdGroup(dto, {
      validateOnly,
    });
  }

  @Post('/add-geo-targeting-to-campaign')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async addGeoTargetingToCampaign(
    @Body() dto: AddGeotargetingToCampaignDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.addGeoTargetingToCampaign(dto, {
      validateOnly,
    });
  }

  @Post('/update-campaign')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async updateCampaignStatus(
    @Body() dto: UpdateCampaignDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.updateCampaignStatus(dto, {
      validateOnly,
    });
  }
}
