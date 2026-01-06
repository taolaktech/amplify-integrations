import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { Public, SkipApiKeyAuth } from 'src/auth/decorators';
import { TokenAuthGuard } from 'src/auth/token-auth.guard';
import { ExtendedRequest } from 'src/common/interfaces/request.interface';
import { GoogleAdsAuthService } from '../services/google-ads-auth.service';
import { AppConfigService } from 'src/config/config.service';
import { Response } from 'express';
import { Logger } from '@nestjs/common';

@Controller('api/google-ads/auth')
export class GoogleAdsAuthController {
  private readonly logger = new Logger(GoogleAdsAuthController.name);
  constructor(
    private googleAdsAuthService: GoogleAdsAuthService,
    private config: AppConfigService,
  ) {}

  @ApiOperation({
    summary: 'Get Google Auth URL',
    description: 'Returns the Google OAuth URL for authentication.',
  })
  @SkipApiKeyAuth()
  @UseGuards(TokenAuthGuard)
  @Get('/url')
  async getAuthUrl(@Req() request: ExtendedRequest) {
    const userId = request.authenticatedData._id.toString();
    const url = await this.googleAdsAuthService.getGoogleAuthUrl(userId);
    return { oauthurl: url };
  }

  @ApiOperation({
    summary: 'Google Auth Redirect',
    description:
      'Handles the OAuth redirect from Google and redirects to the frontend with code, state, and platform.',
  })
  @Public()
  @Get('/redirect')
  async googleAuthCallback(
    @Query() q: { [k: string]: string },
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    this.logger.log(
      'Google Auth Redirect - ' + JSON.stringify({ q, code, state }),
    );

    if (!code || !state) {
      throw new BadRequestException('Missing code or state');
    }

    const clientUrl = this.config.get('GOOGLE_ADS_REDIRECT_URL');
    const redirectUrl = new URL(clientUrl);
    redirectUrl.searchParams.set('code', code);
    redirectUrl.searchParams.set('state', state);
    redirectUrl.searchParams.set('platform', 'google_ads');
    return res.redirect(redirectUrl.toString());
  }

  @ApiOperation({
    summary: 'Google Auth Callback (Frontend)',
    description:
      'Endpoint for the frontend to call after Google redirects back with code and state. Persists tokens, user profile, and accessible customers.',
  })
  @ApiQuery({ name: 'code', description: 'Authorization code', required: true })
  @ApiQuery({ name: 'state', description: 'OAuth state token', required: true })
  @SkipApiKeyAuth()
  @UseGuards(TokenAuthGuard)
  @Get('/callback')
  async googleAuthFrontendCallback(
    @Req() request: ExtendedRequest,
    @Query() q: { [k: string]: string },
  ) {
    const userId = request.authenticatedData._id.toString();
    return await this.googleAdsAuthService.googleAuthCallbackHandler({
      ...q,
      userId,
    });
  }
}
