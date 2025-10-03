import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { GoogleAdsService } from './google-ads.service';
import {
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';
import {
  AddGeotargetingToCampaignDto,
  AddKeywordsToAdGroupDto,
  CreateAdGroupAdDto,
  CreateAdGroupDto,
  CreateBudgetDto,
  CreateTargetRoasBiddingStrategyDto,
  CreateSearchCampaignDto,
  UpdateGoogleCampaignDto,
  CreateCustomerDto,
  CreateConversionActionDto,
  GenerateKeywordIdeasDto,
  GetCampaignByNameOrIdDto,
  GetConversionActionByNameOrIdDto,
  GetBiddingStrategyByNameOrIdDto,
  GetAdGroupByNameOrIdDto,
} from './dto';

class Result {
  @ApiProperty()
  resourceName: string;
}
class ResourceCreationResponse {
  @ApiProperty({ type: [Result] })
  result: Result[] | undefined;
}
class CreateResourceResponse {
  @ApiProperty({ type: ResourceCreationResponse })
  response: ResourceCreationResponse;

  @ApiProperty()
  '[resource]': object;
}

@ApiSecurity('x-api-key')
@Controller('api/google-ads')
export class GoogleAdsController {
  constructor(private googleAdsService: GoogleAdsService) {}

  @ApiOperation({
    summary: 'Get Google Auth URL',
    description: 'Returns the Google OAuth URL for authentication.',
  })
  @Get('/auth/url')
  getAuthUrl() {
    const url = this.googleAdsService.getGoogleAuthUrl();
    return { url };
  }

  @ApiOperation({
    summary: 'Google Auth Callback',
    description:
      'Handles the OAuth redirect and processes the authentication callback.',
  })
  @Public()
  @Get('/auth/redirect')
  async googleAuthCallback(@Query() q: { [k: string]: string }) {
    return await this.googleAdsService.googleAuthCallbackHandler(q);
  }

  @ApiOperation({
    summary: 'Create a new Google Ads customer account',
    description: 'Creates a new customer account in Google Ads.',
  })
  @Post('/customers/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createCustomer(
    @Body() dto: CreateCustomerDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createCustomer(dto, { validateOnly });
  }

  @ApiOperation({
    summary: 'Create a conversion action',
    description: 'Creates a new conversion action for tracking conversions.',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversion action Created Successfully',
    type: CreateResourceResponse,
  })
  @Post('/conversion-actions/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createConversionAction(
    @Body() dto: CreateConversionActionDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createConversionAction(dto, {
      validateOnly,
    });
  }

  @ApiOperation({
    summary: 'Get list of accessible customers',
    description: 'Retrieves a list of accessible Google Ads customer accounts.',
  })
  @Get('/customers/accessible-customers')
  async getCustomers() {
    return await this.googleAdsService.listAccessibleCustomers();
  }

  @ApiOperation({
    summary: 'Get conversion actions',
    description: 'Retrieves a list of conversion actions for a customer.',
  })
  @Get('/customer/:customerId/conversion-actions')
  async getConversionActions(@Param('customerId') customerId: string) {
    return await this.googleAdsService.getConversionActions(customerId);
  }

  @ApiOperation({
    summary: 'Get conversion action by name or ID',
    description:
      'Retrieves a conversion action by its name or ID for a customer.',
  })
  @Post('/conversion-actions/get-by-name-or-id')
  async getConversionActionByNameOrId(@Body() dto: GetCampaignByNameOrIdDto) {
    return await this.googleAdsService.getConversionActionByNameOrId(dto);
  }

  @ApiOperation({
    summary: 'Get campaign by name or ID',
    description: 'Retrieves a campaign by its name or ID for a customer.',
  })
  @Post('/campaigns/get-by-name-or-id')
  async getCampaignByNameOrId(@Body() dto: GetConversionActionByNameOrIdDto) {
    return await this.googleAdsService.getCampaignByNameOrId(dto);
  }

  @ApiOperation({
    summary: 'Create campaign budget',
    description: 'Creates a new campaign budget in Google Ads.',
  })
  @ApiResponse({
    status: 201,
    description: 'Budget Created Successfully',
    type: CreateResourceResponse,
  })
  @Post('/campaign-budgets/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createBudget(
    @Body() dto: CreateBudgetDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createBudget(dto, { validateOnly });
  }

  @ApiOperation({
    summary: 'Create Target ROAS bidding strategy',
    description: 'Creates a new Target ROAS bidding strategy for campaigns.',
  })
  @ApiResponse({
    status: 201,
    description: 'Bidding Strategy Created Successfully',
    type: CreateResourceResponse,
  })
  @Post('/bidding-strategy/target-roas/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createTargetRoasBiddingStrategy(
    @Body() dto: CreateTargetRoasBiddingStrategyDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createTargetRoasBiddingStrategy(dto, {
      validateOnly,
    });
  }

  @ApiOperation({
    summary: 'Get bidding strategy by name or ID',
    description:
      'Retrieves a bidding strategy by its name or ID for a customer.',
  })
  @Post('/bidding-strategy/get-by-name-or-id')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async getBiddingStrategyByNameOrId(
    @Body() dto: GetBiddingStrategyByNameOrIdDto,
  ) {
    return await this.googleAdsService.getBiddingStrategyByNameOrId(dto);
  }

  @ApiOperation({
    summary: 'Create search campaign',
    description: 'Creates a new search campaign in Google Ads.',
  })
  @ApiResponse({
    status: 201,
    description: 'Camapign Created Successfully',
    type: CreateResourceResponse,
  })
  @Post('/campaigns/search-campaign/create')
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

  @ApiOperation({
    summary: 'Create ad group',
    description: 'Creates a new ad group within a campaign.',
  })
  @ApiResponse({
    status: 201,
    description: 'Ad group Created Successfully',
    type: CreateResourceResponse,
  })
  @Post('/ad-groups/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createAdGroup(
    @Body() dto: CreateAdGroupDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createAdGroup(dto, { validateOnly });
  }

  @ApiOperation({
    summary: 'Get adGroup by name or ID',
    description: 'Retrieves a adGroup by its name or ID for a customer.',
  })
  @Post('/ad-groups/get-by-name-or-id')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async getAdGroupByNameOrId(@Body() dto: GetAdGroupByNameOrIdDto) {
    return await this.googleAdsService.getAdGroupByNameOrId(dto);
  }

  @ApiOperation({
    summary: 'Create ad group ad',
    description: 'Creates a new ad within an ad group.',
  })
  @ApiResponse({
    status: 201,
    description: 'Adgroup ad Created Successfully',
    type: CreateResourceResponse,
  })
  @Post('/ad-group-ads/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createAdGroupAd(
    @Body() dto: CreateAdGroupAdDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createAdGroupAd(dto, { validateOnly });
  }

  @ApiOperation({
    summary: 'Generate keyword ideas',
    description: 'Generates keyword ideas for a campaign or ad group.',
  })
  @ApiQuery({ name: 'pageToken', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: String })
  @Post('/keyword-ideas/generate')
  async generateKeywordIdeas(
    @Body() dto: GenerateKeywordIdeasDto,
    @Query() query: { [k: string]: string },
  ) {
    return await this.googleAdsService.generateKeywordIdeas(dto, query);
  }

  @ApiOperation({
    summary: 'Add keywords to ad group',
    description: 'Adds keywords to an existing ad group.',
  })
  @Post('/ad-groups/add-keywords')
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

  @ApiOperation({
    summary: 'Add geo targeting to campaign',
    description: 'Adds geo targeting options to a campaign.',
  })
  @Post('/campaigns/add-geo-targeting')
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

  @ApiOperation({
    summary: 'Update campaign status',
    description: 'Updates the status of a campaign (e.g., ENABLED, PAUSED).',
  })
  @Post('/campaigns/update-status')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async updateCampaignStatus(
    @Body() dto: UpdateGoogleCampaignDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.updateCampaignStatus(dto, {
      validateOnly,
    });
  }
}
