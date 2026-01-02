import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { GoogleAdsService } from '../services/google-ads.service';
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
  CreateMaxConversionsBiddingStrategyDto,
  CreateSearchCampaignDto,
  UpdateGoogleCampaignDto,
  CreateCustomerDto,
  CreateConversionActionDto,
  GenerateKeywordIdeasDto,
  GetCampaignByNameOrIdDto,
  GetConversionActionByNameOrIdDto,
  GetBiddingStrategyByNameOrIdDto,
  GetAdGroupByNameOrIdDto,
  GetAdGroupMetricsDto,
  CreateGoogleAdsCustomerAssetDto,
  CreateGoogleAdsCampaignAssetDto,
  CreateGoogleAdsAssetDto,
  GetCampaignMetricsDto,
  GetCampaignBatchMetricsDto,
} from '../dto';

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
    summary: 'Create an asset',
    description: 'Creates a new asset.',
  })
  @ApiResponse({
    status: 201,
    description: 'Asset Created Successfully',
    type: CreateResourceResponse,
  })
  @Post('/asset/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createAsset(
    @Body() dto: CreateGoogleAdsAssetDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createGoogleAdsAsset(dto, {
      validateOnly,
    });
  }

  @ApiOperation({
    summary: 'Create a customer asset',
    description: 'Creates a new customer asset like logo, business name etc.',
  })
  @ApiResponse({
    status: 201,
    description: 'Customer Asset Created Successfully',
    type: CreateResourceResponse,
  })
  @Post('/customer-asset/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createCustomerAsset(
    @Body() dto: CreateGoogleAdsCustomerAssetDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createGoogleAdsCustomerAsset(dto, {
      validateOnly,
    });
  }

  @ApiOperation({
    summary: 'Create a campaign asset',
    description: 'Creates a campaign asset like logo, business name etc.',
  })
  @ApiResponse({
    status: 201,
    description: 'Campaign Asset Created Successfully',
    type: CreateResourceResponse,
  })
  @Post('/campaign-asset/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createCampaignAsset(
    @Body() dto: CreateGoogleAdsCampaignAssetDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createGoogleAdsCampaignAsset(dto, {
      validateOnly,
    });
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
    summary: 'Get campaign metrics',
    description: 'Retrieves campaign metrics.',
  })
  @Post('/campaigns/get-metrics')
  async getCampaignMetrics(@Body() dto: GetCampaignMetricsDto) {
    return await this.googleAdsService.getCampaignMetrics(dto);
  }

  @ApiOperation({
    summary: 'Get batch campaign metrics',
    description: 'Retrieves campaign metrics.',
  })
  @Post('/campaigns/get-metrics/batch')
  async getCampaignBatchMetrics(@Body() dto: GetCampaignBatchMetricsDto) {
    return await this.googleAdsService.getCampaignBatchMetrics(dto);
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
    summary: 'Create Maximize conversions bidding strategy',
    description:
      'Creates a new Maximize conversions bidding strategy for campaigns.',
  })
  @ApiResponse({
    status: 201,
    description: 'Bidding Strategy Created Successfully',
    type: CreateResourceResponse,
  })
  @Post('/bidding-strategy/max-conversions/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createMaxConversionsBiddingStrategy(
    @Body() dto: CreateMaxConversionsBiddingStrategyDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createMaxConversionsBiddingStrategy(
      dto,
      {
        validateOnly,
      },
    );
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
    summary: 'Create performance max campaign',
    description: 'Creates a new performance max campaign in Google Ads.',
  })
  @ApiResponse({
    status: 201,
    description: 'Camapign Created Successfully',
    type: CreateResourceResponse,
  })
  @Post('/campaigns/performance-max-campaign/create')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async createPerformanceMaxCampaign(
    @Body() dto: CreateSearchCampaignDto,
    @Query() query: { [k: string]: string },
  ) {
    const validateOnly = query.validateOnly === '1';
    return await this.googleAdsService.createPerformanceMaxCampaign(dto, {
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
    description:
      'Retrieves a adGroup by its name or ID for a customer and campaign.',
  })
  @Post('/ad-groups/get-by-name-or-id')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async getAdGroupByNameOrId(@Body() dto: GetAdGroupByNameOrIdDto) {
    return await this.googleAdsService.getAdGroupByNameOrId(dto);
  }

  @ApiOperation({
    summary: 'Get adGroup by id with metrics',
    description: 'Retrieves a adGroup by its ID for a customer and campaign.',
  })
  @Post('/ad-groups/metrics')
  @ApiQuery({ name: 'validateOnly', required: false, type: Number })
  async getAdgroupMetrics(@Body() dto: GetAdGroupMetricsDto) {
    return await this.googleAdsService.getAdGroupMetrics(dto);
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
