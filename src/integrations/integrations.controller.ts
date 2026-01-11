import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipApiKeyAuth } from 'src/auth/decorators';
import { TokenAuthGuard } from 'src/auth/token-auth.guard';
import { ExtendedRequest } from 'src/common/interfaces/request.interface';
import { DisconnectIntegrationDto } from './dto';
import { IntegrationsService } from './integrations.service';

@ApiTags('Integrations')
@Controller('api/integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @ApiOperation({
    summary: 'Get integrations connection status',
    description:
      'Returns Business.integrations plus frontend-friendly booleans and key connection details for each platform.',
  })
  @SkipApiKeyAuth()
  @UseGuards(TokenAuthGuard)
  @Get('/status')
  async getStatus(@Req() request: ExtendedRequest) {
    const userId = request.authenticatedData._id.toString();
    const data = await this.integrationsService.getStatus(userId);
    return { success: true, data };
  }

  @ApiOperation({
    summary: 'Disconnect an integration platform',
    description:
      'Disconnects the given platform for the authenticated user by clearing Business.integrations and platform-specific connection state.',
  })
  @SkipApiKeyAuth()
  @UseGuards(TokenAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @Post('/disconnect')
  async disconnect(
    @Req() request: ExtendedRequest,
    @Body() body: DisconnectIntegrationDto,
  ) {
    const userId = request.authenticatedData._id.toString();
    const data = await this.integrationsService.disconnect(userId, body);
    return { success: true, data };
  }
}
