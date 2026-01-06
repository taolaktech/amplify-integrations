import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { SkipApiKeyAuth } from 'src/auth/decorators';
import { TokenAuthGuard } from 'src/auth/token-auth.guard';
import { ExtendedRequest } from 'src/common/interfaces/request.interface';
import { SetPrimaryCustomerAccountDto } from '../dto';
import { GoogleAdsCustomersService } from '../services/google-ads-customers.service';

@ApiSecurity('x-api-key')
@Controller('api/google-ads/customers')
export class GoogleAdsCustomersController {
  constructor(private googleAdsCustomersService: GoogleAdsCustomersService) {}

  @ApiOperation({
    summary: 'Get accessible customers for primary connection',
    description:
      "Returns the stored list of accessible Google Ads customers for the authenticated user's primary Google Ads connection.",
  })
  @SkipApiKeyAuth()
  @UseGuards(TokenAuthGuard)
  @Get('/accessible-customers')
  async getPrimaryAccessibleCustomers(@Req() request: ExtendedRequest) {
    const userId = request.authenticatedData._id.toString();
    return await this.googleAdsCustomersService.getPrimaryConnectionCustomers(
      userId,
    );
  }

  @ApiOperation({
    summary: 'Set primary customer account for primary connection',
    description:
      "Sets primaryCustomerAccount on the authenticated user's primary Google Ads connection.",
  })
  @SkipApiKeyAuth()
  @UseGuards(TokenAuthGuard)
  @Post('/set-primary-customer-account')
  async setPrimaryCustomerAccount(
    @Req() request: ExtendedRequest,
    @Body() body: SetPrimaryCustomerAccountDto,
  ) {
    const userId = request.authenticatedData._id.toString();
    return await this.googleAdsCustomersService.setPrimaryCustomerAccount({
      userId,
      primaryCustomerAccount: body?.primaryCustomerAccount,
    });
  }
}
