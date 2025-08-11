import { Controller, Get, Param } from '@nestjs/common';
import { BusinessService } from './business.service';
import { ApiSecurity } from '@nestjs/swagger';

@ApiSecurity('x-api-key')
@Controller('api/business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get('/:businessId')
  async findOne(@Param('businessId') id: string) {
    const business = await this.businessService.getBusinessById(id);
    return { business };
  }
}
