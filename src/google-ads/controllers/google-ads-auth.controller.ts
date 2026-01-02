import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiOperation,
  ApiProperty,
  ApiQuery,
  ApiSecurity,
} from '@nestjs/swagger';
import { Public } from 'src/auth/decorators';
import { GoogleAdsAuthService } from '../services/google-ads-auth.service';

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
@Controller('api/google-ads/auth')
export class GoogleAdsAuthController {
  constructor(private googleAdsAuthService: GoogleAdsAuthService) {}

  @ApiOperation({
    summary: 'Get Google Auth URL',
    description: 'Returns the Google OAuth URL for authentication.',
  })
  @ApiQuery({ name: 'user_id', description: 'User ID', required: true })
  @Get('/url')
  getAuthUrl(@Query('user_id') userId: string) {
    const url = this.googleAdsAuthService.getGoogleAuthUrl(userId);
    return { oauthurl: url };
  }

  @ApiOperation({
    summary: 'Google Auth Callback',
    description:
      'Handles the OAuth redirect and processes the authentication callback.',
  })
  @Public()
  @Get('/redirect')
  async googleAuthCallback(@Query() q: { [k: string]: string }) {
    return await this.googleAdsAuthService.googleAuthCallbackHandler(q);
  }
}
