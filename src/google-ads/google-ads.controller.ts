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
  CreateTargetRoasBiddingStrategyDto,
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

  @Post('/campaign-budget/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createBudget(
    @Body() dto: CreateBudgetDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createBudget(dto, { validateOnly });
  }

  @Post('/bidding-strategy/target-roas/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createTargetRoasBiggingStrategy(
    @Body() dto: CreateTargetRoasBiddingStrategyDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createTargetRoasBiddingStrategy(dto, {
      validateOnly,
    });
  }

  @Post('/campaign/search-campaign/create')
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

  @Post('/ad-group/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createAdGroup(
    @Body() dto: CreateAdGroupDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createAdGroup(dto, { validateOnly });
  }

  @Post('/ad-group-ad/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createAdGroupAd(
    @Body() dto: CreateAdGroupAdDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createAdGroupAd(dto, { validateOnly });
  }

  @Post('/ad-group/add-keywords')
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

  @Post('/campaign/add-geo-targeting')
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

  @Post('/campaign/update-status')
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
