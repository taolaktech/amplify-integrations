import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { BusinessService } from './business.service';
import { ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { SaveGoogleAdsCustomerDataDto } from './dto/save-googleads-data.dto';

@ApiSecurity('x-api-key')
@Controller('api/business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('/:businessId')
  async findOne(@Param('businessId') id: string) {
    const business = await this.businessService.getBusinessById(id);
    return { business };
  }

  @Patch('/:businessId/save-googleads-customer-data')
  @ApiOperation({ summary: 'Save google ads customer data for user' })
  @ApiResponse({
    status: 200,
    description: 'Data saved successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Data already exists',
  })
  async saveGoogleCustomerData(
    @Param('businessId') businessId: string,
    @Body() dto: SaveGoogleAdsCustomerDataDto,
  ) {
    const business = await this.businessService.saveGoogleAdsCustomerData(
      businessId,
      dto,
    );

    return business;
  }
}
