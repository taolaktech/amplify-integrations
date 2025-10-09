import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FacebookAuthService } from './facebook-auth.service';
import { Response } from 'express';
import { FacebookCallbackQueryDto } from './dtos/facebook-auth-query.dto';
// import { AuthGuard } from 'src/auth/auth.guard';
import { ExtendedRequest } from 'src/common/interfaces/request.interface';
import { Public } from 'src/auth/decorators';
import { FacebookTokenMonitorService } from '../services/facebook-token-monitor.service';
import { SelectPrimaryAdAccountDto } from './dtos/select-primary-ad-account.dto';
import { TokenAuthGuard } from 'src/auth/token-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AdAccountsListResponse,
  FacebookOAuthCallbackResponse,
  InstagramAccountsListResponse,
  InstagramSetupStatusResponse,
  PrimaryAccountResponse,
  RefreshAccountsResponse,
  RemoveAccountResponse,
  SelectPrimaryInstagramAccountResponse,
  SelectPrimaryResponse,
  TokenStatusResponse,
} from './dtos/facebook-auth-response.dto';
import { CreateMetaPixelDto } from './dtos/create-meta-pixel.dto';
import { SelectPrimaryInstagramAccountDto } from './dtos/select-primary-instagram-account.dto';

@ApiTags('Facebook Authentication')
@ApiBearerAuth()
@Public()
@Controller('facebook-auth')
export class FacebookAuthController {
  constructor(
    private readonly facebookAuthService: FacebookAuthService,
    private readonly facebookTokenMonitorService: FacebookTokenMonitorService,
  ) {}

  @Public()
  @UseGuards(TokenAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'Initiate Facebook OAuth',
    description:
      'Redirects user to Facebook OAuth consent page to authorize Amplify access to their ad accounts and pages.',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Facebook OAuth consent page',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to generate OAuth URL',
  })
  redirectToFacebook(
    @Req() request: ExtendedRequest,
    @Res() res: Response,
    @Query('platforms') platforms?: string,
  ) {
    const user = request['authenticatedData'];
    const userId = user._id.toString(); // user._id.toString(); // '680690b4b7fe560e4582cf2f'

    // Default to Facebook only if no platforms specified
    const requestedPlatforms = platforms ? platforms.split(',') : ['facebook'];

    const state = this.facebookAuthService.generateStateToken(
      userId,
      requestedPlatforms,
    );
    const url = this.facebookAuthService.getAuthRedirectURL(
      state,
      requestedPlatforms,
    );
    return res.redirect(url);
  }

  @Public()
  @Get('callback')
  @ApiOperation({
    summary: 'Handle Facebook OAuth callback',
    description:
      "Processes the OAuth callback from Facebook, exchanges code for tokens, and stores user's ad accounts and pages.",
  })
  @ApiQuery({ name: 'code', description: 'Authorization code from Facebook' })
  @ApiQuery({
    name: 'state',
    description: 'State token for security validation',
  })
  @ApiResponse({
    status: 200,
    description: 'OAuth callback processed successfully',
    type: FacebookOAuthCallbackResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid callback parameters or state token',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired state token',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to process OAuth callback',
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleCallback(@Query() query: FacebookCallbackQueryDto) {
    const { code, state } = query;
    console.log(`code => ${code}`);
    console.log(`state => ${state}`);

    const oauthData = await this.facebookAuthService.handleOAuthCallback(
      code,
      state,
    );

    return {
      data: oauthData,
      success: true,
      message: 'Facebook OAuth callback handled successfully',
    };
  }

  @Get('ad-accounts')
  @UseGuards(TokenAuthGuard)
  @ApiOperation({
    summary: "Get user's Facebook ad accounts",
    description:
      'Retrieves all Facebook ad accounts connected to the user with their integration status, permissions, and capabilities.',
  })
  @ApiResponse({
    status: 200,
    description: 'Ad accounts retrieved successfully',
    type: AdAccountsListResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to fetch ad accounts',
  })
  async fetchUserAdAccounts(@Req() request: ExtendedRequest) {
    const user = request['authenticatedData'];
    const adAccounts =
      await this.facebookAuthService.getUserAdAccountsWithStatus(
        user._id.toString(),
      );

    return {
      data: adAccounts,
      success: true,
      message: 'Ad accounts fetched successfully',
    };
  }

  @Delete('ad-accounts/:accountId')
  @UseGuards(TokenAuthGuard)
  @ApiOperation({
    summary: 'Remove Facebook ad account',
    description:
      "Removes a Facebook ad account from the user's connected accounts. Cannot remove primary account.",
  })
  @ApiParam({
    name: 'accountId',
    description: 'Facebook ad account ID (e.g., act_1234567890)',
  })
  @ApiResponse({
    status: 200,
    description: 'Ad account removed successfully',
    type: RemoveAccountResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot remove primary ad account',
  })
  @ApiResponse({
    status: 404,
    description: 'Ad account not found',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  async removeAdAccount(
    @Req() request: ExtendedRequest,
    @Param('accountId') accountId: string,
  ) {
    const userId = request.authenticatedData._id.toString();

    await this.facebookAuthService.removeAdAccount(userId, accountId);

    return {
      success: true,
      message: 'Ad account removed successfully',
    };
  }

  @Get('instagram-accounts')
  @UseGuards(TokenAuthGuard)
  @ApiOperation({
    summary: "Get user's Instagram accounts",
    description:
      'Retrieves all Instagram business accounts connected to the user Facebook pages.',
  })
  @ApiResponse({
    status: 200,
    description: 'Instagram accounts retrieved successfully',
    type: InstagramAccountsListResponse,
  })
  async fetchUserInstagramAccounts(@Req() request: ExtendedRequest) {
    const user = request['authenticatedData'];
    const instagramAccounts =
      await this.facebookAuthService.getUserInstagramAccountsWithStatus(
        user._id.toString(),
      );

    return {
      data: instagramAccounts,
      success: true,
      message: 'Instagram accounts fetched successfully',
    };
  }

  @Post('instagram-accounts/primary/select')
  @UseGuards(TokenAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Select primary Instagram account',
    description: 'Sets an Instagram account as primary for campaign creation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Primary Instagram account selected successfully',
    type: SelectPrimaryInstagramAccountResponse,
  })
  async selectPrimaryInstagramAccount(
    @Req() request: ExtendedRequest,
    @Body() body: SelectPrimaryInstagramAccountDto,
  ) {
    const userId = request.authenticatedData._id.toString();

    const result = await this.facebookAuthService.selectPrimaryInstagramAccount(
      userId,
      body.instagramAccountId,
    );

    return {
      success: true,
      data: result,
      message: 'Primary Instagram account selected successfully',
    };
  }

  @Get('instagram-accounts/primary')
  @UseGuards(TokenAuthGuard)
  @ApiOperation({
    summary: 'Get primary Instagram account',
    description: "Retrieves the user's primary Instagram account.",
  })
  @ApiResponse({
    status: 200,
    description: 'Primary Instagram account retrieved successfully',
  })
  async getPrimaryInstagramAccount(@Req() request: ExtendedRequest) {
    const userId = request.authenticatedData._id.toString();
    const primaryAccount =
      await this.facebookAuthService.getPrimaryInstagramAccount(userId);

    return {
      success: true,
      data: primaryAccount,
      message: 'Primary Instagram account retrieved successfully',
    };
  }

  @Get('instagram-setup-status')
  @UseGuards(TokenAuthGuard)
  @ApiOperation({
    summary: 'Check Instagram setup status',
    description:
      'Checks if user has Instagram Business accounts connected to their Facebook pages.',
  })
  @ApiResponse({
    status: 200,
    description: 'Instagram setup status retrieved successfully',
    type: InstagramSetupStatusResponse,
  })
  async checkInstagramSetupStatus(
    @Req() request: ExtendedRequest,
  ): Promise<InstagramSetupStatusResponse> {
    const userId = request.authenticatedData._id.toString();

    const setupStatus =
      await this.facebookAuthService.getInstagramSetupStatus(userId);

    return {
      success: true,
      data: setupStatus,
      message: setupStatus.hasInstagramAccounts
        ? `Found ${setupStatus.instagramAccountCount} Instagram account(s)`
        : 'No Instagram Business accounts found. Connect an Instagram account to your Facebook pages to run Instagram ads.',
    };
  }

  @Get('instagram-setup-guide')
  @ApiOperation({
    summary: 'Get Instagram setup guide',
    description:
      'Provides instructions for connecting Instagram Business accounts to Facebook pages for advertising and integration.',
  })
  getInstagramSetupGuide() {
    return {
      success: true,
      message: 'Instagram setup guide retrieved successfully.',
      data: {
        steps: [
          {
            step: 1,
            title: 'Convert to a Professional Account',
            description:
              "On the Instagram app, go to your profile, tap 'Edit Profile', and select 'Switch to Professional Account'. You can choose either a 'Business' or 'Creator' account type.",
          },
          {
            step: 2,
            title: 'Connect Your Facebook Page',
            description:
              "After setting up a professional account, go to 'Edit Profile' again. Under 'Public business information', tap on 'Page' to connect your Instagram account to the corresponding Facebook Page you manage.",
          },
          {
            step: 3,
            title: 'Confirm Connection and Refresh',
            description:
              'Once the connection is successful, return to this application and refresh your accounts. We will then be able to detect the newly linked Instagram Business account.',
          },
          {
            step: 4,
            title: 'Select Your Primary Instagram Account',
            description:
              'If multiple Instagram accounts are connected to your Facebook pages, please select the primary one you wish to use for your campaigns within our dashboard.',
          },
        ],
        helpLinks: [
          {
            title: 'How to set up a business account on Instagram',
            url: 'https://help.instagram.com/502981923235522',
          },
          {
            title: 'Link your Instagram account to a Facebook Page',
            url: 'https://help.instagram.com/356902681064399',
          },
        ],
      },
    };
  }

  @Post('ad-accounts/primary/select')
  @UseGuards(TokenAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({
    summary: 'Select primary ad account',
    description:
      "Sets an ad account as primary and requests system user permissions for campaign management. This enables Amplify to create campaigns on the user's behalf.",
  })
  @ApiResponse({
    status: 200,
    description:
      'Primary ad account selected and system user permissions requested',
    type: SelectPrimaryResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid ad account ID or system user assignment failed',
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated or invalid Facebook permissions',
  })
  @ApiResponse({
    status: 403,
    description: 'Ad account not found or access denied',
  })
  async selectPrimaryAdAccount(
    @Req() request: ExtendedRequest,
    @Body() body: SelectPrimaryAdAccountDto,
  ) {
    const userId = request.authenticatedData._id.toString();

    // Validate that the ad account belongs to the user
    // REMOVE FUNCTION IN SERVICE FILE
    // this.facebookAuthService.selectPrimaryAdAccount(userId, primaryAccount)
    const primaryAdAccountWithPermission =
      await this.facebookAuthService.selectPrimaryAdAccountWithPermissions(
        userId,
        body.adAccountId,
        body.pageId,
        body.metaPixelId,
        body.instagramAccountId,
      );

    return {
      success: true,
      data: primaryAdAccountWithPermission,
      message: primaryAdAccountWithPermission.message,
    };
  }

  @Get('ad-accounts/primary')
  @UseGuards(TokenAuthGuard)
  @ApiOperation({
    summary: 'Get primary ad account',
    description:
      "Retrieves the user's primary ad account with full integration status, permissions, and campaign readiness information.",
  })
  @ApiResponse({
    status: 200,
    description: 'Primary ad account retrieved successfully',
    type: PrimaryAccountResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to get primary ad account',
  })
  async getPrimaryAdAccount(@Req() request: ExtendedRequest) {
    const userId = request.authenticatedData._id.toString();
    const primaryAccount =
      await this.facebookAuthService.getPrimaryAdAccountWithStatus(userId);

    return {
      success: true,
      data: primaryAccount.data,
      message: primaryAccount.message,
    };
  }

  @Get('token-status')
  @UseGuards(TokenAuthGuard)
  @ApiOperation({
    summary: 'Get Facebook token status',
    description:
      "Checks the health and expiration status of the user's Facebook access token. Provides re-authentication URL if token needs renewal.",
  })
  @ApiResponse({
    status: 200,
    description: 'Token status retrieved successfully',
    type: TokenStatusResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to check token status',
  })
  async getTokenStatus(@Req() request: ExtendedRequest) {
    const userId = request.authenticatedData._id.toString();

    const tokenHealth =
      await this.facebookTokenMonitorService.checkUserTokenHealth(userId);

    return {
      success: true,
      data: {
        hasValidToken: tokenHealth.hasValidToken,
        expiresAt: tokenHealth.expiresAt,
        daysUntilExpiry: tokenHealth.daysUntilExpiry,
        needsReauth: tokenHealth.needsReauth,
        reAuthUrl: tokenHealth.needsReauth
          ? this.facebookAuthService.getAuthRedirectURL(
              this.facebookAuthService.generateStateToken(userId),
            )
          : null,
      },
    };
  }

  @Get('/ad-accounts/:accountId/permission-status')
  @UseGuards(TokenAuthGuard)
  async getPermissionStatus(
    @Req() request: ExtendedRequest,
    @Param('accountId') accountId: string,
  ) {
    const userId = request.authenticatedData._id.toString();
    const permissionStatus =
      await this.facebookAuthService.checkSystemUserPermissionStatus(
        userId,
        accountId,
      );

    return {
      success: true,
      data: permissionStatus,
    };
  }

  /**
   * Refresh ad accounts from Facebook and update permission status
   */
  @Post('ad-accounts/refresh')
  @UseGuards(TokenAuthGuard)
  @ApiOperation({
    summary: 'Refresh ad accounts from Facebook',
    description:
      "Syncs user's ad accounts from Facebook API, detects new accounts, updates existing ones, and checks system user permissions for all accounts.",
  })
  @ApiResponse({
    status: 200,
    description: 'Ad accounts refreshed successfully',
    type: RefreshAccountsResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'User not authenticated or Facebook token expired',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to refresh ad accounts',
  })
  async refreshAdAccounts(@Req() request: ExtendedRequest) {
    const userId = request.authenticatedData._id.toString();

    const refreshResult =
      await this.facebookAuthService.refreshUserAdAccountsWithPermissions(
        userId,
      );

    return {
      success: true,
      message: this.buildRefreshMessage(refreshResult),
      data: {
        newAccountsFound: refreshResult.newAccounts.length,
        accountsUpdated: refreshResult.updatedAccounts.length,
        permissionsUpdated: refreshResult.permissionUpdates.length,
        accountsRemoved: refreshResult.removedAccounts.length,
        totalAccounts: refreshResult.totalAccounts,
        newAccounts: refreshResult.newAccounts.map((acc) => ({
          accountId: acc.accountId,
          name: acc.name,
          currency: acc.currency,
          businessName: acc.businessName,
        })),
        permissionUpdates: refreshResult.permissionUpdates,
        tokenStatus: {
          isValid: refreshResult.tokenStatus.isValid,
          expiresAt: refreshResult.tokenStatus.expiresAt,
          ...(refreshResult.tokenStatus.expiresAt && {
            daysUntilExpiry: Math.ceil(
              (refreshResult.tokenStatus.expiresAt.getTime() - Date.now()) /
                (1000 * 60 * 60 * 24),
            ),
          }),
        },
      },
    };
  }

  @Post('/ad-accounts/:accountId/generate-meta-pixel-id')
  async generateMetaPixelId(
    @Req() request: ExtendedRequest,
    @Param('accountId') accountId: string,
    @Body() createMetaPixelDto: CreateMetaPixelDto,
  ) {
    const userId = request.authenticatedData._id.toString();

    const generatedPixelId = await this.facebookAuthService.generateMetaPixelId(
      accountId,
      userId,
      createMetaPixelDto.name,
    );

    return {
      data: {
        metaPixelId: generatedPixelId,
      },
      message: 'Meta Pixel Id successfully generated, please complete setup',
      sucess: true,
    };
  }

  private buildRefreshMessage(result: any): string {
    const parts: string[] = [];

    if (result.newAccounts.length > 0) {
      parts.push(
        `Found ${result.newAccounts.length} new ad account${result.newAccounts.length > 1 ? 's' : ''}`,
      );
    }

    if (result.updatedAccounts.length > 0) {
      parts.push(
        `updated ${result.updatedAccounts.length} existing account${result.updatedAccounts.length > 1 ? 's' : ''}`,
      );
    }

    if (result.permissionUpdates.length > 0) {
      parts.push(
        `updated permissions for ${result.permissionUpdates.length} account${result.permissionUpdates.length > 1 ? 's' : ''}`,
      );
    }

    if (result.removedAccounts.length > 0) {
      parts.push(
        `detected ${result.removedAccounts.length} removed account${result.removedAccounts.length > 1 ? 's' : ''}`,
      );
    }

    if (parts.length === 0) {
      return 'No changes detected. All ad accounts are up to date.';
    }

    return parts.join(', ').replace(/,(?=[^,]*$)/, ' and');
  }
}
