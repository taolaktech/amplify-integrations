import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FacebookPage } from '../../database/schema/facebook-page.schema';
import mongoose, { Model } from 'mongoose';
import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';
import {
  FacebookAdAccount,
  FacebookAdAccountDocument,
  UserToken,
  InstagramAccount,
} from 'src/database/schema';
import { FacebookTokenService } from '../services/facebook-token.service';
import { SelectPrimaryAdAccountDto } from './dtos/select-primary-ad-account.dto';
import { FacebookBusinessManagerService } from '../services/facebook-business-manager.service';
import {
  IGetPrimaryAdAccountWithStatusResponse,
  IRefreshAdAccountResponse,
} from '../interfaces/interface';

@Injectable()
export class FacebookAuthService {
  private readonly logger = new Logger(FacebookAuthService.name);

  private readonly graph = axios.create({
    baseURL: 'https://graph.facebook.com/v23.0',
  });

  constructor(
    @InjectModel('facebook-pages')
    private facebookPageModel: Model<FacebookPage>,
    @InjectModel('facebook-ad-accounts')
    private facebookAdAccountModel: Model<FacebookAdAccount>,
    @InjectModel('user-tokens')
    private userTokenModel: Model<UserToken>,
    @InjectModel('instagram-accounts')
    private instagramAccountModel: Model<InstagramAccount>,
    private config: ConfigService,
    private jwtService: JwtService,
    private facebookTokenService: FacebookTokenService,
    private facebookBusinessManagerService: FacebookBusinessManagerService,
  ) {}

  getAuthRedirectURL(
    state: string,
    platforms: string[] = ['facebook'],
  ): string {
    const FACEBOOK_APP_ID = this.config.get<string>(
      'FACEBOOK_APP_ID',
    ) as string;
    const FACEBOOK_REDIRECT_URI = this.config.get<string>(
      'FACEBOOK_REDIRECT_URI',
    ) as string;

    // Base permissions always required
    const basePermissions = [
      'email',
      'public_profile',
      'pages_show_list',
      'pages_manage_ads',
      'ads_management',
      'ads_read',
      'business_management',
      'pages_read_engagement',
    ];

    // Add Instagram permissions only if requested
    if (platforms.includes('instagram')) {
      basePermissions.push(
        'instagram_basic', // Add Instagram permissions
        'instagram_content_publish', // For creating Instagram content
        'instagram_manage_comments', // For managing comments
        'instagram_manage_insights', // For insights
      );
    }

    const query = new URLSearchParams({
      client_id: FACEBOOK_APP_ID,
      redirect_uri: FACEBOOK_REDIRECT_URI,
      scope: basePermissions.join(','),
      response_type: 'code',
      state,
      auth_type: 'rerequest',
    });

    return `https://www.facebook.com/v23.0/dialog/oauth?${query.toString()}`;
  }

  /**
   * Exchanges an authorization code for a Facebook access token.
   *
   * @param code - The authorization code received from Facebook OAuth.
   * @returns An object containing the access token and its expiration time.
   * @throws InternalServerErrorException if the token exchange fails.
   */
  async exchangeCodeForToken(
    code: string,
  ): Promise<{ access_token: string; expires_in: number }> {
    try {
      this.logger.debug('::: Exchanging code for token :::');
      const res = await this.graph.get('/oauth/access_token', {
        params: {
          client_id: this.config.get('FACEBOOK_APP_ID'),
          client_secret: this.config.get('FACEBOOK_APP_SECRET'),
          redirect_uri: this.config.get('FACEBOOK_REDIRECT_URI'),
          code,
        },
      });

      return res.data;
    } catch (err) {
      this.logger.error(
        'Failed to exchange code for token',
        JSON.stringify(err),
      );
      throw new InternalServerErrorException(
        'Failed to exchange code for token',
      );
    }
  }

  /**
   * Fetches the list of Facebook pages associated with the user using the provided access token.
   *
   * @param accessToken - The Facebook user access token.
   * @returns A promise that resolves to an array of user pages.
   * @throws InternalServerErrorException if the request to fetch pages fails.
   */
  async fetchUserPages(accessToken: string): Promise<any[]> {
    try {
      this.logger.debug('::: Fetching user pages :::');
      const res = await this.graph.get('/me/accounts', {
        params: { access_token: accessToken },
      });

      this.logger.debug(
        `::: Fetched user pages => ${JSON.stringify(res.data, null, 2)}:::`,
      );

      return res.data.data;
    } catch (err: any) {
      this.logger.error('Failed to fetch Facebook pages', JSON.stringify(err));
      throw new InternalServerErrorException('Failed to fetch Facebook pages');
    }
  }

  async saveUserPages(userId: string, pages: any[]): Promise<void> {
    try {
      for (const page of pages) {
        const existing = await this.facebookPageModel.findOne({
          pageId: page.id,
        });

        if (existing) {
          await this.facebookPageModel.updateOne(
            { pageId: page.id },
            {
              $set: {
                pageName: page.name,
                pageCategory: page.category || null,
                accessToken: page.access_token,
                updatedAt: new Date(),
              },
            },
          );
        } else {
          await this.facebookPageModel.create({
            userId,
            pageId: page.id,
            pageName: page.name,
            pageCategory: page.category || null,
            accessToken: page.access_token,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        'Failed to persist Facebook pages',
        error?.message || error,
      );
      throw new InternalServerErrorException('Error saving Facebook pages');
    }
  }

  generateStateToken(
    userId: string,
    platforms: string[] = ['facebook'],
  ): string {
    return this.jwtService.sign(
      { userId, platforms },
      {
        secret: this.config.get<string>('OAUTH_STATE_SECRET') as string,
        expiresIn: '10m',
      },
    );
  }

  verifyStateToken(token: string): { userId: string; platforms: string[] } {
    try {
      this.logger.debug('::: Verifying state token :::');
      return this.jwtService.verify(token, {
        secret: this.config.get<string>('OAUTH_STATE_SECRET') as string,
      });
    } catch (error) {
      this.logger.error('Failed to verify state token', error);
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
      }
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException('Token verification failed');
    }
  }

  /**
   * Retrieves the list of Facebook ad accounts associated with the user using the provided access token.
   * Logs and throws an InternalServerErrorException if the fetch operation fails.
   *
   * @param accessToken - The Facebook user access token.
   * @returns Promise resolving to an array of ad account objects.
   */
  async fetchUserAdAccounts(accessToken: string): Promise<any[]> {
    try {
      const response = await this.graph.get('/me/adaccounts', {
        params: {
          access_token: accessToken,
          fields: 'id,name,currency,account_status,business_name,capabilities',
        },
      });

      // this.logger.log(
      //   `::: fetched user Ad Accounts => ${JSON.stringify(response.data.data)} :::`,
      // );

      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to fetch user ad accounts', error);
      throw new InternalServerErrorException('Failed to fetch ad accounts');
    }
  }

  async handleOAuthCallback(code: string, state: string) {
    //1. Verify state token
    const payload = this.verifyStateToken(state);
    const userId = payload.userId;
    const requestedPlatforms = payload.platforms || ['facebook'];

    let adAccounts = [] as any;
    let pages = [] as any;
    let instagramAccounts = [] as any;

    // 2. Exchange code for SHORT_LIVED token
    const tokenData = await this.exchangeCodeForToken(code);
    console.log(`token data => ${JSON.stringify(tokenData)}`);

    // 3. Exchange SHORT_LIVED token for LONG_LIVED token
    const longTokenData =
      await this.facebookTokenService.exchangeForLongLivedToken(
        tokenData.access_token,
      );
    console.log(`long lived token => ${JSON.stringify(longTokenData)}`);

    // 4. Store the long lived token securely
    await this.facebookTokenService.storeUserToken(
      userId,
      longTokenData.access_token,
      'access',
      longTokenData.expires_in,
      'email,public_profile,pages_show_list,pages_manage_ads,ads_management,ads_read,business_management,pages_read_engagement',
    );
    // await this.storeUserAccessToken(
    //   payload.userId,
    //   tokenData.access_token,
    //   tokenData.expires_in,
    // );
    //

    // Always need pages for Instagram (since Instagram accounts are connected to pages)
    if (
      requestedPlatforms.includes('instagram') ||
      requestedPlatforms.includes('facebook')
    ) {
      pages = await this.fetchUserPages(longTokenData.access_token);
      await this.saveUserPages(payload.userId, pages);
    }

    // Only fetch Facebook ad accounts if requested
    if (requestedPlatforms.includes('facebook')) {
      adAccounts = await this.fetchUserAdAccounts(longTokenData.access_token);
      await this.saveUserAdAccounts(payload.userId, adAccounts);
    }

    // 7. Only fetch Instagram accounts if explicitly requested
    if (requestedPlatforms.includes('instagram')) {
      instagramAccounts = await this.fetchInstagramAccounts(
        longTokenData.access_token,
        pages,
      );
      await this.saveInstagramAccounts(payload.userId, instagramAccounts);
    }

    return {
      adAccounts: requestedPlatforms.includes('facebook')
        ? adAccounts
        : undefined,
      pages,
      instagramAccounts: requestedPlatforms.includes('instagram')
        ? instagramAccounts
        : undefined,
      requestedPlatforms,
      needsAdAccountSelection: adAccounts.length > 1,
      needsInstagramAccountSelection:
        requestedPlatforms.includes('instagram') &&
        instagramAccounts.length > 1,
      hasInstagramAccounts: requestedPlatforms.includes('instagram')
        ? instagramAccounts.length > 0
        : undefined,
      pagesWithoutInstagram: requestedPlatforms.includes('instagram')
        ? pages.length - instagramAccounts.length
        : undefined,
    };
  }

  async saveUserAdAccounts(userId: string, adAccounts: any[]): Promise<void> {
    for (const account of adAccounts) {
      const existing = await this.facebookAdAccountModel.findOne({
        accountId: account.id,
      });

      if (existing) {
        await this.facebookAdAccountModel.updateOne(
          { accountId: account.id },
          {
            $set: {
              name: account.name,
              currency: account.currency,
              accountStatus: account.account_status,
              businessName: account.business_name,
              capabilities: account.capabilities,
              updatedAt: new Date(),
            },
          },
        );
      } else {
        await this.facebookAdAccountModel.create({
          userId,
          accountId: account.id,
          name: account.name,
          currency: account.currency,
          accountStatus: account.account_status,
          businessName: account.business_name,
          capabilities: account.capabilities,
        });
      }
    }
  }

  async getUserAdAccountsWithStatus(userId: string): Promise<{
    adAccounts: any[];
    hasPrimary: boolean;
    total: number;
    readyForCampaigns: number;
    needsSetup: number;
    assignmentFailed: number;
  }> {
    try {
      this.logger.debug(`Fetching ad accounts with status for user: ${userId}`);

      // 1. Get all user's ad accounts from database
      const adAccounts = await this.facebookAdAccountModel
        .find({ userId })
        .sort({ isPrimary: -1, name: 1 }) // Primary first, then alphabetical
        .lean();

      if (adAccounts.length === 0) {
        return {
          adAccounts: [],
          hasPrimary: false,
          total: 0,
          readyForCampaigns: 0,
          needsSetup: 0,
          assignmentFailed: 0,
        };
      }

      this.logger.debug(
        `Found ${adAccounts.length} ad accounts, checking status for each...`,
      );

      // 2. Check system user assignment status for each account in parallel
      const enrichedAccountsPromises = adAccounts.map(async (account) => {
        try {
          // Skip status check if recently checked (within last 5 minutes)
          const lastCheck = account.systemUserPermission?.lastStatusCheck;
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

          if (lastCheck && lastCheck > fiveMinutesAgo) {
            this.logger.debug(
              `Skipping status check for account ${account.accountId} - recently checked`,
            );

            // Still calculate capabilities from cached data
            const cachedCapabilities = this.calculateCapabilitiesFromTasks(
              account.systemUserPermission?.grantedTasks || [],
            );

            return {
              ...account,
              capabilities: cachedCapabilities,
            };
          }

          // Perform live status check
          this.logger.debug(
            `Checking live status for account: ${account.accountId}`,
          );

          const assignment =
            await this.facebookBusinessManagerService.checkSystemUserAssignment(
              account.accountId,
            );

          const capabilities =
            await this.facebookBusinessManagerService.getSystemUserCapabilities(
              account.accountId,
            );

          // 3. Update database with latest status
          const updateData: any = {
            'systemUserPermission.lastStatusCheck': new Date(),
            'systemUserPermission.grantedTasks': assignment.grantedTasks,
          };

          if (assignment.isAssigned) {
            updateData['systemUserPermission.assignmentStatus'] = 'ASSIGNED';
            if (!account.systemUserPermission?.assignedAt) {
              updateData['systemUserPermission.assignedAt'] = new Date();
            }
            updateData['integrationStatus'] = capabilities.canCreateCampaigns
              ? 'READY_FOR_CAMPAIGNS'
              : 'SYSTEM_USER_ASSIGNED';
            // also set assignmentError to null if canCreateCampaigns is true
            if (capabilities.canCreateCampaigns) {
              updateData['systemUserPermission.assignmentError'] = null;
            }
          } else {
            // System user not found in assigned users
            if (account.systemUserPermission?.assignmentStatus === 'ASSIGNED') {
              // Was assigned before but now missing - update status
              updateData['systemUserPermission.assignmentStatus'] =
                'ASSIGNMENT_FAILED';
              updateData['systemUserPermission.assignmentError'] =
                'System user no longer in assigned users list';
            }
            updateData['integrationStatus'] = 'SETUP_INCOMPLETE';
          }

          await this.facebookAdAccountModel.updateOne(
            { _id: account._id },
            { $set: updateData },
          );

          // 4. Return enriched account data
          return {
            ...account,
            systemUserPermission: {
              ...account.systemUserPermission,
              assignmentStatus: assignment.isAssigned
                ? 'ASSIGNED'
                : 'NOT_REQUESTED',
              grantedTasks: assignment.grantedTasks,
              lastStatusCheck: new Date(),
            },
            integrationStatus: assignment.isAssigned
              ? capabilities.canCreateCampaigns
                ? 'READY_FOR_CAMPAIGNS'
                : 'SYSTEM_USER_ASSIGNED'
              : 'SETUP_INCOMPLETE',
            capabilities: {
              canCreateCampaigns: capabilities.canCreateCampaigns,
              canManageAds: capabilities.canManageAds,
              canViewInsights: capabilities.canViewInsights,
              grantedTasks: capabilities.grantedTasks,
              missingTasks: capabilities.missingTasks,
            },
          };
        } catch (error) {
          this.logger.warn(
            `Failed to check status for account ${account.accountId}:`,
            error.message,
          );

          // Update database with error status
          try {
            await this.facebookAdAccountModel.updateOne(
              { _id: account._id },
              {
                $set: {
                  'systemUserPermission.lastStatusCheck': new Date(),
                  'systemUserPermission.assignmentError': `Status check failed: ${error.message}`,
                  integrationStatus: 'ASSIGNMENT_FAILED',
                },
              },
            );
          } catch (dbError) {
            this.logger.error(
              `Failed to update error status for account ${account.accountId}:`,
              dbError,
            );
          }

          // Return account with error status
          return {
            ...account,
            integrationStatus: 'ASSIGNMENT_FAILED',
            systemUserPermission: {
              ...account.systemUserPermission,
              assignmentError: `Status check failed: ${error.message}`,
              lastStatusCheck: new Date(),
            },
            capabilities: {
              canCreateCampaigns: false,
              canManageAds: false,
              canViewInsights: false,
              grantedTasks: [],
              missingTasks: ['MANAGE', 'ADVERTISE', 'ANALYZE'],
            },
          };
        }
      });

      // 5
      const enrichedAccounts = await Promise.all(enrichedAccountsPromises);

      // 6. Calculate summary statistics
      const hasPrimary = enrichedAccounts.some((account) => account.isPrimary);
      const readyForCampaigns = enrichedAccounts.filter(
        (account) => account.integrationStatus === 'READY_FOR_CAMPAIGNS',
      ).length;
      const needsSetup = enrichedAccounts.filter(
        (account) => account.integrationStatus === 'SETUP_INCOMPLETE',
      ).length;
      const assignmentFailed = enrichedAccounts.filter(
        (account) => account.integrationStatus === 'ASSIGNMENT_FAILED',
      ).length;

      this.logger.debug(`Ad accounts status summary for user ${userId}:`, {
        total: enrichedAccounts.length,
        readyForCampaigns,
        needsSetup,
        assignmentFailed,
        hasPrimary,
      });

      return {
        adAccounts: enrichedAccounts,
        hasPrimary,
        total: enrichedAccounts.length,
        readyForCampaigns,
        needsSetup,
        assignmentFailed,
      };
    } catch (error) {
      this.logger.error('Failed to get user ad accounts with status', error);
      throw new InternalServerErrorException(
        'Failed to fetch ad accounts with status',
      );
    }
  }

  /**
   * Helper method to calculate capabilities from granted tasks
   */
  private calculateCapabilitiesFromTasks(grantedTasks: string[]) {
    const requiredTasks = ['MANAGE', 'ADVERTISE', 'ANALYZE'];
    const missingTasks = requiredTasks.filter(
      (task) => !grantedTasks.includes(task),
    );

    return {
      canCreateCampaigns:
        grantedTasks.includes('ADVERTISE') && grantedTasks.includes('MANAGE'),
      canManageAds: grantedTasks.includes('MANAGE'),
      canViewInsights: grantedTasks.includes('ANALYZE'),
      grantedTasks,
      missingTasks,
    };
  }

  /**
   * Sets a specific Facebook ad account as the primary account for a given user.
   *
   * @description
   * This method performs the following operations:
   * 1. Validates that the ad account exists and belongs to the specified user
   * 2. Clears the primary flag from all user's ad accounts
   * 3. Sets the specified account as primary with `isPrimary: true`
   * 4. Updates the `updatedAt` timestamp for audit purposes
   *
   * @param userId - The unique identifier of the user whose primary ad account is being set
   * @param adAccountId - The Facebook ad account ID to be designated as primary
   *
   * @throws {Error} If the ad account doesn't exist or doesn't belong to the user
   * @throws {InternalServerErrorException} For any unexpected server errors
   */
  async setPrimaryAdAccount(
    userId: string,
    adAccountId: string,
  ): Promise<void> {
    try {
      this.logger.debug(
        `Setting primary ad account for user ${userId}: ${adAccountId}`,
      );

      // First, ensure the ad account belongs to this user
      const adAccount = await this.facebookAdAccountModel.findOne({
        userId,
        accountId: adAccountId,
      });

      if (!adAccount) {
        throw new Error('Ad account not found or does not belong to user');
      }

      // Remove primary flag from all user's ad accounts
      await this.facebookAdAccountModel.updateMany(
        { userId },
        { $set: { isPrimary: false } },
      );

      // Set the selected account as primary
      await this.facebookAdAccountModel.updateOne(
        { userId, accountId: adAccountId },
        { $set: { isPrimary: true, updatedAt: new Date() } },
      );

      this.logger.debug(`Successfully set primary ad account: ${adAccountId}`);
    } catch (error) {
      this.logger.error('Failed to set primary ad account', error);
      throw new InternalServerErrorException(
        'Failed to set primary ad account',
      );
    }
  }

  async refreshUserAdAccounts(userId: string): Promise<{
    newAccounts: any[];
    updatedAccounts: any[];
    totalAccounts: number;
  }> {
    try {
      this.logger.debug(`Refreshing ad accounts for user: ${userId}`);

      // Get user's stored access token (you'll need to store this during OAuth)
      const token = await this.facebookTokenService.getUserToken(userId);
      if (!token) {
        throw new Error('User access token not found. Please re-authenticate.');
      }

      // 2. Validate token is still working
      const validation = await this.facebookTokenService.validateToken(token);
      if (!validation.isValid) {
        throw new UnauthorizedException(
          'Facebook token has expired. Please re-authenticate.',
        );
      }

      // Fetch fresh ad accounts from Facebook
      const freshAdAccounts = await this.fetchUserAdAccounts(token);

      const newAccounts: FacebookAdAccountDocument[] = [];
      const updatedAccounts: FacebookAdAccountDocument[] = [];

      for (const account of freshAdAccounts) {
        const existing = await this.facebookAdAccountModel.findOne({
          accountId: account.id,
        });

        if (existing) {
          // Update existing account
          const updated = await this.facebookAdAccountModel.findOneAndUpdate(
            { accountId: account.id },
            {
              $set: {
                name: account.name,
                currency: account.currency,
                accountStatus: account.account_status,
                businessName: account.business_name,
                capabilities: account.capabilities,
                updatedAt: new Date(),
              },
            },
            { new: true },
          );

          // Handle the null case
          if (updated) {
            updatedAccounts.push(updated);
          } else {
            // Log warning if update failed but don't throw error
            this.logger.warn(
              `Failed to update ad account ${account.id} for user ${userId}`,
            );
          }
        } else {
          // Create new account
          const newAccount = await this.facebookAdAccountModel.create({
            userId,
            accountId: account.id,
            name: account.name,
            currency: account.currency,
            accountStatus: account.account_status,
            businessName: account.business_name,
            capabilities: account.capabilities,
            isPrimary: false, // New accounts are not primary by default
          });
          newAccounts.push(newAccount);
        }
      }

      return {
        newAccounts,
        updatedAccounts,
        totalAccounts: freshAdAccounts.length,
      };
    } catch (error) {
      this.logger.error('Failed to refresh ad accounts', error);

      // Check if it's a token expiration error
      if (
        error.response?.status === 401 ||
        error.message.includes('token') ||
        error instanceof UnauthorizedException
      ) {
        // construct reAuthUrl
        const data = {
          success: false,
          error: 'REAUTHENTICATION REQUIRED',
          message: 'Facebook access token expired. Please re-authenticate.',
          reAuthUrl: this.getAuthRedirectURL(this.generateStateToken(userId)),
        };

        throw new UnauthorizedException(data);
      }

      throw new InternalServerErrorException('Failed to refresh ad accounts');
    }
  }

  private async storeUserAccessToken(
    userId: string,
    accessToken: string,
    expiresIn: number,
  ): Promise<void> {
    try {
      const encryptedToken =
        this.facebookTokenService.encryptToken(accessToken);
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // Remove old tokens
      await this.userTokenModel.deleteMany({
        userId,
        provider: 'facebook',
        tokenType: 'access',
      });

      // Store new token
      await this.userTokenModel.create({
        userId,
        provider: 'facebook',
        tokenType: 'access',
        encryptedToken,
        expiresAt,
        isActive: true,
      });

      this.logger.debug(`Stored access token for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to store user access token', error);
      throw new InternalServerErrorException('Failed to store access token');
    }
  }

  /**
   * Retrieves the primary Facebook ad account for a given user and checks its status.
   *
   * This method performs the following steps:
   * 1. Attempts to find the primary ad account associated with the provided user ID.
   * 2. If no primary account is found, it checks for any existing ad accounts and auto-sets the first one as primary.
   * 3. Checks the live system user assignment status for the primary account, using cached data if available.
   * 4. Updates the database with the latest status if a live check was performed.
   * 5. Constructs and returns a response containing the account details, integration status, system user permissions, and capabilities.
   *
   * @param userId - The ID of the user for whom to retrieve the primary ad account.
   * @returns A promise that resolves to an object containing the account details and status message.
   *
   * @throws InternalServerErrorException - If an error occurs while retrieving the primary ad account or checking its status.
   */
  async getPrimaryAdAccountWithStatus(
    userId: string,
  ): Promise<IGetPrimaryAdAccountWithStatusResponse> {
    try {
      this.logger.debug(
        `Getting primary ad account with status for user: ${userId}`,
      );

      // 1. Get primary ad account from database
      let primaryAccount = await this.facebookAdAccountModel
        .findOne({ userId, isPrimary: true })
        .lean();

      // 2. Handle no primary account case - auto-set first account as primary
      if (!primaryAccount) {
        this.logger.debug(
          'No primary account found, checking for any ad accounts...',
        );

        const firstAccount = await this.facebookAdAccountModel
          .findOne({ userId })
          .lean();

        if (!firstAccount) {
          // No ad accounts at all
          return {
            message:
              'No ad accounts found. Please connect your Facebook ad account first.',
          };
        }

        // Auto-set first account as primary
        this.logger.debug(
          `Auto-setting account ${firstAccount.accountId} as primary`,
        );

        await this.facebookAdAccountModel.updateOne(
          { _id: firstAccount._id },
          { $set: { isPrimary: true, updatedAt: new Date() } },
        );

        primaryAccount = { ...firstAccount, isPrimary: true };
      }

      this.logger.debug(`Found primary account: ${primaryAccount.accountId}`);

      // 3.Get live system user assignment status
      try {
        // Skip status check if recently checked (within last 3 minutes for primary account)
        const lastCheck = primaryAccount.systemUserPermission?.lastStatusCheck;
        const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

        let assignment;
        let capabilities;
        let isLiveCheck = false;

        if (lastCheck && lastCheck > threeMinutesAgo) {
          this.logger.debug(
            `Using cached status for primary account ${primaryAccount.accountId}`,
          );

          // Use cached data
          assignment = {
            isAssigned:
              primaryAccount.systemUserPermission?.assignmentStatus ===
              'ASSIGNED',
            grantedTasks:
              primaryAccount.systemUserPermission?.grantedTasks || [],
          };
          capabilities = this.calculateCapabilitiesFromTasks(
            assignment.grantedTasks,
          );
        } else {
          this.logger.debug(
            `Performing live status check for primary account ${primaryAccount.accountId}`,
          );
          isLiveCheck = true;

          // Perform live status check
          assignment =
            await this.facebookBusinessManagerService.checkSystemUserAssignment(
              primaryAccount.accountId,
            );

          capabilities =
            await this.facebookBusinessManagerService.getSystemUserCapabilities(
              primaryAccount.accountId,
            );
        }

        // 4.Update database with latest status (only if live check was performed)
        if (isLiveCheck) {
          const updateData: any = {
            'systemUserPermission.lastStatusCheck': new Date(),
            'systemUserPermission.grantedTasks': assignment.grantedTasks,
          };

          if (assignment.isAssigned) {
            updateData['systemUserPermission.assignmentStatus'] = 'ASSIGNED';
            if (!primaryAccount.systemUserPermission?.assignedAt) {
              updateData['systemUserPermission.assignedAt'] = new Date();
            }
            updateData['integrationStatus'] = capabilities.canCreateCampaigns
              ? 'READY_FOR_CAMPAIGNS'
              : 'SYSTEM_USER_ASSIGNED';
          } else {
            // System user not found in assigned users
            if (
              primaryAccount.systemUserPermission?.assignmentStatus ===
              'ASSIGNED'
            ) {
              updateData['systemUserPermission.assignmentStatus'] =
                'ASSIGNMENT_FAILED';
              updateData['systemUserPermission.assignmentError'] =
                'System user no longer in assigned users list';
            } else {
              updateData['systemUserPermission.assignmentStatus'] =
                'NOT_REQUESTED';
            }
            updateData['integrationStatus'] = 'SETUP_INCOMPLETE';
          }

          await this.facebookAdAccountModel.updateOne(
            { _id: primaryAccount._id },
            { $set: updateData },
          );

          this.logger.debug(`Updated primary account status:`, {
            accountId: primaryAccount.accountId,
            isAssigned: assignment.isAssigned,
            canCreateCampaigns: capabilities.canCreateCampaigns,
          });
        }

        // 5. Build response
        const accountWithExtra = {
          account: {
            accountId: primaryAccount.accountId,
            name: primaryAccount.name,
            currency: primaryAccount.currency,
            businessName: primaryAccount.businessName,
            isPrimary: true,
          },
          integrationStatus: assignment.isAssigned
            ? capabilities.canCreateCampaigns
              ? 'READY_FOR_CAMPAIGNS'
              : 'SYSTEM_USER_ASSIGNED'
            : 'SETUP_INCOMPLETE',
          systemUserPermission: {
            assignmentStatus: assignment.isAssigned
              ? 'ASSIGNED'
              : 'NOT_REQUESTED',
            grantedTasks: assignment.grantedTasks,
            lastStatusCheck: isLiveCheck ? new Date() : lastCheck || new Date(),
            ...(primaryAccount.systemUserPermission?.assignmentError && {
              assignmentError:
                primaryAccount.systemUserPermission.assignmentError,
            }),
          },
          capabilities: {
            canCreateCampaigns: capabilities.canCreateCampaigns,
            canManageAds: capabilities.canManageAds,
            canViewInsights: capabilities.canViewInsights,
            grantedTasks: capabilities.grantedTasks,
            missingTasks: capabilities.missingTasks,
          },
          readyForCampaigns: capabilities.canCreateCampaigns,
        };

        return {
          data: accountWithExtra,
          message: capabilities.canCreateCampaigns
            ? 'Primary ad account is ready for campaigns'
            : `Primary ad account needs setup. Missing permissions: ${capabilities.missingTasks.join(', ')}`,
        };
      } catch (statusError) {
        //  return account info with error status
        this.logger.error(
          `Failed to check status for primary account ${primaryAccount.accountId}:`,
          statusError.message,
        );

        // Update database with error status
        try {
          await this.facebookAdAccountModel.updateOne(
            { _id: primaryAccount._id },
            {
              $set: {
                'systemUserPermission.lastStatusCheck': new Date(),
                'systemUserPermission.assignmentError': `Status check failed: ${statusError.message}`,
                integrationStatus: 'ASSIGNMENT_FAILED',
              },
            },
          );
        } catch (dbError) {
          this.logger.error(
            `Failed to update error status for primary account:`,
            dbError,
          );
        }

        return {
          data: {
            account: {
              accountId: primaryAccount.accountId,
              name: primaryAccount.name,
              currency: primaryAccount.currency,
              businessName: primaryAccount.businessName,
              isPrimary: true,
            },
            integrationStatus: 'ASSIGNMENT_FAILED',
            systemUserPermission: {
              assignmentStatus: 'ASSIGNMENT_FAILED',
              grantedTasks: [],
              lastStatusCheck: new Date(),
              assignmentError: `Status check failed: ${statusError.message}`,
            },
            capabilities: {
              canCreateCampaigns: false,
              canManageAds: false,
              canViewInsights: false,
              grantedTasks: [],
              missingTasks: ['MANAGE', 'ADVERTISE', 'ANALYZE'],
            },
            readyForCampaigns: false,
          },
          message: `Primary ad account found but status check failed: ${statusError.message}`,
        };
      }
    } catch (error) {
      this.logger.error('Failed to get primary ad account with status', error);
      throw new InternalServerErrorException(
        'Failed to get primary ad account status',
      );
    }
  }

  async getPrimaryAdAccount(userId: string): Promise<any> {
    try {
      const primaryAccount = await this.facebookAdAccountModel
        .findOne({ userId, isPrimary: true })
        .lean();

      if (!primaryAccount) {
        // If no primary is set, return the first one (if any)
        const firstAccount = await this.facebookAdAccountModel
          .findOne({ userId })
          .lean();

        if (firstAccount) {
          // Auto-set it as primary
          await this.setPrimaryAdAccount(userId, firstAccount.accountId);
          return { ...firstAccount, isPrimary: true };
        }
      }

      return primaryAccount;
    } catch (error) {
      this.logger.error('Failed to get primary ad account', error);
      throw new InternalServerErrorException(
        'Failed to get primary ad account',
      );
    }
  }

  async removeAdAccount(userId: string, accountId: string): Promise<void> {
    try {
      // Check if it's the primary account
      const primaryAccount = await this.getPrimaryAdAccount(userId);

      if (primaryAccount && primaryAccount.accountId === accountId) {
        throw new BadRequestException(
          'Cannot remove primary ad account. Please select a different account.',
        );
      }

      await this.facebookAdAccountModel.deleteOne({
        userId,
        accountId,
      });

      this.logger.debug(`Removed ad account ${accountId} for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to remove ad account', error);
      throw new InternalServerErrorException('Failed to remove ad account');
    }
  }

  async validateAdAccountAccess(
    userId: string,
    adAccountId: string,
  ): Promise<boolean> {
    try {
      const account = await this.facebookAdAccountModel.findOne({
        userId,
        accountId: adAccountId,
      });

      return !!account;
    } catch (error) {
      this.logger.error('Failed to validate ad account access', error);
      return false;
    }
  }

  /**
   * REMOVE later if unused
   * Selects the primary ad account for a given user.
   *
   * This method first validates that the specified ad account belongs to the user.
   * If the user does not have access to the ad account, a BadRequestException is thrown.
   * If the validation is successful, the specified ad account is set as the primary account.
   *
   * @param userId - The ID of the user for whom the primary ad account is being selected.
   * @param primaryAccount - An object containing the ad account ID to be set as primary.
   * @throws BadRequestException - If the ad account does not belong to the user.
   * @throws InternalServerErrorException - If an error occurs while selecting the primary ad account.
   */
  async selectPrimaryAdAccount(
    userId: string,
    primaryAccount: SelectPrimaryAdAccountDto,
  ) {
    try {
      // first validate theat the Ad account belongs to the user
      const hasAccess = await this.validateAdAccountAccess(
        userId,
        primaryAccount.adAccountId,
      );

      if (!hasAccess) {
        throw new BadRequestException(
          'Cannot select primary ad account. Please select a different account.',
        );
      }

      // set primary account
      await this.setPrimaryAdAccount(userId, primaryAccount.adAccountId);
    } catch (error) {
      this.logger.error('Failed to select primary ad account', error);
      throw new InternalServerErrorException(
        'Failed to select primary ad account',
      );
    }
  }

  /**
   * Selects a primary ad account for a user and assigns necessary permissions.
   *
   * This method validates the user's access to the specified ad account, sets it as the primary account,
   * and tracks the system user's permissions. It attempts to assign the system user to the ad account
   * with the required permissions and verifies the assignment. The method updates the database with
   * the assignment status and capabilities of the system user.
   *
   * @param userId - The ID of the user requesting the ad account selection.
   * @param adAccountId - The ID of the ad account to be set as primary.
   *
   * @throws ForbiddenException - If the user does not have access to the ad account.
   * @throws InternalServerErrorException - If there is an error during the assignment process or database update.
   * @throws BadRequestException - If the request parameters are invalid.
   * @throws UnauthorizedException - If the user is not authorized to perform this action.
   */
  async selectPrimaryAdAccountWithPermissions(
    userId: string,
    adAccountId: string,
    pageId: string,
    metaPixelId: string | undefined,
    instagramAccountId?: string,
  ): Promise<{
    message: string;
    adAccountId: string;
    assignmentStatus: string;
    canCreateCampaigns: boolean;
    grantedTasks: string[];
    instagramSetup?: {
      hasInstagramAccount: boolean;
      instagramAccountId?: string;
      instagramUsername?: string;
    };
  }> {
    try {
      // 1. Validate access
      const hasAccess = await this.validateAdAccountAccess(userId, adAccountId);
      if (!hasAccess) {
        throw new ForbiddenException('Ad account not found or access denied');
      }

      // 2. Set as primary
      await this.setPrimaryAdAccount(userId, adAccountId);

      // 2. Find and atomically update the selected page to primary in our DB to ensure it belongs to the user
      const selectedPage = await this.facebookPageModel.findOneAndUpdate(
        {
          userId,
          pageId,
        },
        {
          $set: {
            isPrimaryPage: true,
          },
        },
      );

      if (!selectedPage) {
        throw new NotFoundException(
          'Selected Facebook Page not found or does not belong to the user.',
        );
      }

      // 3. If Instagram account is provided, set it as primary
      if (instagramAccountId) {
        // Validate that the Instagram account belongs to the user
        const instagramAccount = await this.instagramAccountModel.findOne({
          userId,
          instagramAccountId,
        });

        if (!instagramAccount) {
          throw new NotFoundException(
            'Selected Instagram account not found or does not belong to the user.',
          );
        }

        // Set the Instagram account as primary
        await this.instagramAccountModel.updateMany(
          { userId },
          { $set: { isPrimary: false } },
        );

        await this.instagramAccountModel.updateOne(
          { userId, instagramAccountId },
          { $set: { isPrimary: true, updatedAt: new Date() } },
        );

        // Update the ad account with the selected Instagram account
        await this.facebookAdAccountModel.updateOne(
          { userId, accountId: adAccountId },
          {
            $set: {
              selectedPrimaryInstagramAccountId:
                instagramAccount._id.toString(),
            },
          },
        );
      } else {
        // Check if user has any Instagram accounts at all
        const userInstagramAccounts = await this.instagramAccountModel.find({
          userId,
        });

        // If user has Instagram accounts but didn't select one, that's okay
        // If user has no Instagram accounts, we'll note that in the response
        if (userInstagramAccounts.length === 0) {
          this.logger.debug(
            `User ${userId} has no Instagram accounts connected`,
          );
        }
      }

      // 4. Initialize system user permission tracking
      await this.facebookAdAccountModel.updateOne(
        { userId, accountId: adAccountId },
        {
          $set: {
            systemUserPermission: {
              systemUserId: this.config.get('AMPLIFY_SYSTEM_USER_ID'),
              assignmentStatus: 'ASSIGNMENT_PENDING',
              lastAssignmentAttempt: new Date(),
              requestedTasks: ['MANAGE', 'ADVERTISE', 'ANALYZE'],
              grantedTasks: [],
            },
            integrationStatus: 'SETUP_INCOMPLETE',
            updatedAt: new Date(),
            metaPixelId: metaPixelId,
            selectedPrimaryFacebookPageId: selectedPage._id.toString(),
          },
        },
      );

      this.logger.debug(
        `Starting system user assignment for ad account: ${adAccountId}`,
      );

      try {
        // 4. Attempt system user assignment and USE the result
        const assignmentResult =
          await this.facebookBusinessManagerService.requestSystemUserAccess({
            adAccountId,
            permissions: ['MANAGE', 'ADVERTISE', 'ANALYZE'],
          });

        this.logger.debug('Assignment result:', assignmentResult);

        // 5. Check if assignment API call succeeded
        if (!assignmentResult.success) {
          // Assignment API call failed
          await this.facebookAdAccountModel.updateOne(
            { userId, accountId: adAccountId },
            {
              $set: {
                'systemUserPermission.assignmentStatus': 'ASSIGNMENT_FAILED',
                'systemUserPermission.assignmentError':
                  assignmentResult.message || 'Assignment API call failed',
                integrationStatus: 'ASSIGNMENT_FAILED',
              },
            },
          );

          throw new InternalServerErrorException(
            `System user assignment failed: ${assignmentResult.message}`,
          );
        }

        // 6. Assignment API succeeded, now verify it worked
        this.logger.debug('Assignment API succeeded, verifying assignment...');

        const verification =
          await this.facebookBusinessManagerService.checkSystemUserAssignment(
            adAccountId,
          );

        this.logger.debug('Verification result:', verification);

        // 7.  Update database based on BOTH assignment result AND verification
        const updateData: any = {
          'systemUserPermission.lastStatusCheck': new Date(),
        };

        if (verification.isAssigned) {
          // Assignment succeeded AND verification confirmed it
          updateData['systemUserPermission.assignmentStatus'] = 'ASSIGNED';
          updateData['systemUserPermission.assignedAt'] = new Date();
          updateData['systemUserPermission.grantedTasks'] =
            verification.grantedTasks;
          updateData['integrationStatus'] = 'SYSTEM_USER_ASSIGNED';

          this.logger.debug(
            `System user successfully assigned to ad account ${adAccountId}`,
          );
        } else {
          // Assignment API succeeded but verification failed (rare case)
          updateData['systemUserPermission.assignmentStatus'] =
            'ASSIGNMENT_FAILED';
          updateData['systemUserPermission.assignmentError'] =
            'Assignment API succeeded but system user not found in assigned users list';
          updateData['integrationStatus'] = 'ASSIGNMENT_FAILED';

          this.logger.warn(
            `Assignment API succeeded but verification failed for ad account ${adAccountId}`,
          );
        }

        await this.facebookAdAccountModel.updateOne(
          { userId, accountId: adAccountId },
          { $set: updateData },
        );

        // 8. Check final capabilities
        const capabilities =
          await this.facebookBusinessManagerService.getSystemUserCapabilities(
            adAccountId,
          );

        // 9. Final status update if ready for campaigns
        if (verification.isAssigned && capabilities.canCreateCampaigns) {
          await this.facebookAdAccountModel.updateOne(
            { userId, accountId: adAccountId },
            {
              $set: {
                integrationStatus: 'READY_FOR_CAMPAIGNS',
              },
            },
          );
        }

        // Prepare response with Instagram setup info
        const instagramSetup = {
          hasInstagramAccount: !!instagramAccountId,
          instagramAccountId: instagramAccountId || undefined,
          instagramUsername: instagramAccountId
            ? (await this.instagramAccountModel.findOne({ instagramAccountId }))
                ?.username
            : undefined,
        };

        return {
          message: verification.isAssigned
            ? capabilities.canCreateCampaigns
              ? 'Primary ad account set and ready for campaigns'
              : 'Primary ad account set and system user assigned, but missing some permissions'
            : 'Primary ad account set but system user assignment verification failed',
          adAccountId,
          assignmentStatus: verification.isAssigned
            ? 'ASSIGNED'
            : 'ASSIGNMENT_FAILED',
          canCreateCampaigns: capabilities.canCreateCampaigns,
          grantedTasks: verification.grantedTasks,
          instagramSetup,
        };
      } catch (assignmentError) {
        // Handle assignment or verification errors properly
        this.logger.error(
          'System user assignment or verification failed:',
          assignmentError,
        );

        // Update database with specific error
        await this.facebookAdAccountModel.updateOne(
          { userId, accountId: adAccountId },
          {
            $set: {
              'systemUserPermission.assignmentStatus': 'ASSIGNMENT_FAILED',
              'systemUserPermission.assignmentError':
                assignmentError.message || 'Unknown assignment error',
              integrationStatus: 'ASSIGNMENT_FAILED',
            },
          },
        );

        // Re-throw the specific error type
        throw assignmentError;
      }
    } catch (error) {
      // Let specific exceptions bubble up to controller
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      this.logger.error(
        'Failed to select primary ad account with permissions',
        error,
      );
      throw new InternalServerErrorException(
        'Failed to set primary ad account',
      );
    }
  }

  /**
   * Checks the permission status of a system user for a given ad account.
   *
   * @param userId - The ID of the user whose permissions are being checked.
   * @param adAccountId - The ID of the ad account to check permissions against.
   *
   * @throws NotFoundException - If the ad account is not found.
   * @throws InternalServerErrorException - If there is an error while checking the permission status.
   */
  async checkSystemUserPermissionStatus(
    userId: string,
    adAccountId: string,
  ): Promise<{
    assignmentStatus: string;
    canCreateCampaigns: boolean;
    grantedTasks: string[];
    lastChecked: Date;
  }> {
    try {
      const account = await this.facebookAdAccountModel.findOne({
        userId,
        accountId: adAccountId,
      });

      if (!account) {
        throw new NotFoundException('Ad account not found');
      }

      // Get live status from Facebook
      const assignment =
        await this.facebookBusinessManagerService.checkSystemUserAssignment(
          adAccountId,
        );
      const capabilities =
        await this.facebookBusinessManagerService.getSystemUserCapabilities(
          adAccountId,
        );

      // Update database with latest status
      const updateData: any = {
        'systemUserPermission.lastStatusCheck': new Date(),
        'systemUserPermission.grantedTasks': assignment.grantedTasks,
      };

      if (assignment.isAssigned) {
        updateData['systemUserPermission.assignmentStatus'] = 'ASSIGNED';
        if (!account.systemUserPermission?.assignedAt) {
          updateData['systemUserPermission.assignedAt'] = new Date();
        }
        updateData['integrationStatus'] = capabilities.canCreateCampaigns
          ? 'READY_FOR_CAMPAIGNS'
          : 'SYSTEM_USER_ASSIGNED';
      } else {
        updateData['systemUserPermission.assignmentStatus'] = 'NOT_REQUESTED';
        updateData['integrationStatus'] = 'SETUP_INCOMPLETE';
      }

      await this.facebookAdAccountModel.updateOne(
        { userId, accountId: adAccountId },
        { $set: updateData },
      );

      return {
        assignmentStatus: assignment.isAssigned ? 'ASSIGNED' : 'NOT_REQUESTED',
        canCreateCampaigns: capabilities.canCreateCampaigns,
        grantedTasks: assignment.grantedTasks,
        lastChecked: new Date(),
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Failed to check permission status', error);
      throw new InternalServerErrorException(
        'Failed to check permission status',
      );
    }
  }

  /**
   * Refresh user ad accounts from Facebook and update permission status
   */
  /**
   * Refreshes the user's Facebook ad accounts and their permissions.
   *
   * This method retrieves the user's Facebook access token, validates it,
   * and fetches the latest ad accounts associated with the user. It identifies
   * new, updated, and removed accounts, updates the database accordingly, and
   * checks the permissions of the system user for each account.
   *
   * @param userId - The ID of the user whose ad accounts are to be refreshed.
   *
   * @throws UnauthorizedException - If the user's Facebook token is missing or invalid,
   * requiring re-authentication.
   * @throws InternalServerErrorException - If an unexpected error occurs during the process.
   */
  async refreshUserAdAccountsWithPermissions(
    userId: string,
  ): Promise<IRefreshAdAccountResponse> {
    try {
      this.logger.debug(
        `Refreshing ad accounts with permissions for user: ${userId}`,
      );

      // 1. Get and validate user's Facebook token
      const token = await this.facebookTokenService.getUserToken(userId);
      if (!token) {
        // handles re-authentication by throwing UnauthorizedException with re-auth URL
        const reAuthUrl = this.getAuthRedirectURL(
          this.generateStateToken(userId),
        );
        throw new UnauthorizedException({
          error: 'REAUTHENTICATION_REQUIRED',
          message: 'Facebook access token not found. Please re-authenticate.',
          reAuthUrl,
        });
      }

      // 2. Validate token is still working
      const validation = await this.facebookTokenService.validateToken(token);
      if (!validation.isValid) {
        // handles token expiration with re-auth URL
        const reAuthUrl = this.getAuthRedirectURL(
          this.generateStateToken(userId),
        );
        throw new UnauthorizedException({
          error: 'REAUTHENTICATION_REQUIRED',
          message: 'Facebook token has expired. Please re-authenticate.',
          reAuthUrl,
        });
      }

      // 3. Get token expiry information
      const tokenRecord = await this.userTokenModel.findOne({
        userId,
        provider: 'facebook',
        tokenType: 'access',
        isActive: true,
      });

      const tokenStatus = {
        isValid: true,
        expiresAt: tokenRecord?.expiresAt,
      };

      // 4. Fetch fresh ad accounts from Facebook
      const freshAdAccounts = await this.fetchUserAdAccounts(token);
      this.logger.debug(
        `Fetched ${freshAdAccounts.length} ad accounts from Facebook`,
      );

      // 5. Get existing accounts from database
      const existingAccounts = await this.facebookAdAccountModel
        .find({ userId })
        .lean();
      const existingAccountIds = new Set(
        existingAccounts.map((acc) => acc.accountId),
      );
      const freshAccountIds = new Set(freshAdAccounts.map((acc) => acc.id));

      // 6. Identify new, updated, and removed accounts
      const newAccountData = freshAdAccounts.filter(
        (acc) => !existingAccountIds.has(acc.id),
      );
      const updatedAccountData = freshAdAccounts.filter((acc) =>
        existingAccountIds.has(acc.id),
      );
      const removedAccountIds = existingAccounts
        .filter((acc) => !freshAccountIds.has(acc.accountId))
        .map((acc) => acc.accountId);

      this.logger.debug(
        `Account changes: ${newAccountData.length} new, ${updatedAccountData.length} to update, ${removedAccountIds.length} removed`,
      );

      // 7. Create new accounts
      const newAccounts: FacebookAdAccountDocument[] = [];
      for (const account of newAccountData) {
        try {
          const newAccount = await this.facebookAdAccountModel.create({
            userId,
            accountId: account.id,
            name: account.name,
            currency: account.currency,
            accountStatus: account.account_status,
            businessName: account.business_name,
            capabilities: account.capabilities,
            isPrimary: false,
            integrationStatus: 'SETUP_INCOMPLETE',
          });
          newAccounts.push(newAccount);
          this.logger.debug(`Created new account: ${account.id}`);
        } catch (error) {
          this.logger.error(
            `Failed to create new account ${account.id}:`,
            error,
          );
        }
      }

      // 8. Update existing accounts and check permissions in parallel
      const updatedAccounts: FacebookAdAccountDocument[] = [];
      const permissionUpdates: {
        accountId: string;
        oldStatus: string;
        newStatus: string;
        capabilities: any;
      }[] = [];

      const updatePromises = updatedAccountData.map(async (account) => {
        try {
          const existingAccount = existingAccounts.find(
            (acc) => acc.accountId === account.id,
          );
          if (!existingAccount) return;

          // Update basic account information
          const updatedAccount =
            await this.facebookAdAccountModel.findOneAndUpdate(
              { accountId: account.id },
              {
                $set: {
                  name: account.name,
                  currency: account.currency,
                  accountStatus: account.account_status,
                  businessName: account.business_name,
                  capabilities: account.capabilities,
                  updatedAt: new Date(),
                },
              },
              { new: true, runValidators: true },
            );

          if (updatedAccount) {
            updatedAccounts.push(updatedAccount);
          }

          // Check system user permission status
          try {
            const assignment =
              await this.facebookBusinessManagerService.checkSystemUserAssignment(
                account.id,
              );

            const capabilities =
              await this.facebookBusinessManagerService.getSystemUserCapabilities(
                account.id,
              );

            const oldStatus =
              existingAccount.integrationStatus || 'SETUP_INCOMPLETE';
            let newStatus = 'SETUP_INCOMPLETE';

            if (assignment.isAssigned) {
              newStatus = capabilities.canCreateCampaigns
                ? 'READY_FOR_CAMPAIGNS'
                : 'SYSTEM_USER_ASSIGNED';
            }

            // Update permission status in database
            const permissionUpdateData: any = {
              'systemUserPermission.lastStatusCheck': new Date(),
              'systemUserPermission.grantedTasks': assignment.grantedTasks,
              integrationStatus: newStatus,
            };

            if (assignment.isAssigned) {
              permissionUpdateData['systemUserPermission.assignmentStatus'] =
                'ASSIGNED';
              if (!existingAccount.systemUserPermission?.assignedAt) {
                permissionUpdateData['systemUserPermission.assignedAt'] =
                  new Date();
              }
            } else {
              permissionUpdateData['systemUserPermission.assignmentStatus'] =
                'NOT_REQUESTED';
            }

            await this.facebookAdAccountModel.updateOne(
              { accountId: account.id },
              { $set: permissionUpdateData },
            );

            // Track permission changes
            if (oldStatus !== newStatus) {
              permissionUpdates.push({
                accountId: account.id,
                oldStatus,
                newStatus,
                capabilities: {
                  canCreateCampaigns: capabilities.canCreateCampaigns,
                  canManageAds: capabilities.canManageAds,
                  canViewInsights: capabilities.canViewInsights,
                  grantedTasks: capabilities.grantedTasks,
                  missingTasks: capabilities.missingTasks,
                },
              });
            }
          } catch (permissionError) {
            this.logger.warn(
              `Failed to check permissions for account ${account.id}:`,
              permissionError.message,
            );

            await this.facebookAdAccountModel.updateOne(
              { accountId: account.id },
              {
                $set: {
                  'systemUserPermission.lastStatusCheck': new Date(),
                  'systemUserPermission.assignmentError': `Permission check failed: ${permissionError.message}`,
                  integrationStatus: 'ASSIGNMENT_FAILED',
                },
              },
            );
          }
        } catch (error) {
          this.logger.error(`Failed to update account ${account.id}:`, error);
        }
      });

      await Promise.all(updatePromises);

      // 9. Handle removed accounts
      if (removedAccountIds.length > 0) {
        await this.facebookAdAccountModel.updateMany(
          { userId, accountId: { $in: removedAccountIds } },
          {
            $set: {
              integrationStatus: 'ACCOUNT_REMOVED',
              updatedAt: new Date(),
            },
          },
        );
      }

      // 10. Return pure data
      return {
        newAccounts,
        updatedAccounts,
        permissionUpdates,
        removedAccounts: removedAccountIds,
        totalAccounts: freshAdAccounts.length,
        tokenStatus,
      };
    } catch (error) {
      // Check for UnauthorizedException with re-auth so we can rethrow
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(
        'Failed to refresh ad accounts with permissions',
        error,
      );
      throw new InternalServerErrorException('Failed to refresh ad accounts');
    }
  }

  // Add this method to fetch Instagram accounts connected to pages
  async fetchInstagramAccounts(
    accessToken: string,
    pages: any[],
  ): Promise<any[]> {
    try {
      this.logger.debug('::: Fetching Instagram accounts :::');

      const instagramAccounts: any[] = [];

      for (const page of pages) {
        try {
          // Get Instagram account connected to this page
          const response = await this.graph.get(`/${page.id}`, {
            params: {
              access_token: accessToken,
              fields: 'instagram_business_account',
            },
          });

          if (response.data.instagram_business_account) {
            // Get Instagram account details
            const igResponse = await this.graph.get(
              `/${response.data.instagram_business_account.id}`,
              {
                params: {
                  access_token: accessToken,
                  fields: 'id,username,account_type,followers_count',
                },
              },
            );

            instagramAccounts.push({
              ...igResponse.data,
              pageId: page.id,
              pageName: page.name,
            });
          } else {
            // Log that this page has no Instagram account
            this.logger.debug(
              `Page ${page.name} (${page.id}) has no Instagram Business account connected`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to fetch Instagram account for page ${page.id}: ${error.message}`,
          );
        }
      }

      return instagramAccounts;
    } catch (error) {
      this.logger.error('Failed to fetch Instagram accounts', error);
      throw new InternalServerErrorException(
        'Failed to fetch Instagram accounts',
      );
    }
  }

  async saveInstagramAccounts(
    userId: string,
    instagramAccounts: any[],
  ): Promise<void> {
    try {
      for (const account of instagramAccounts) {
        const existing = await this.instagramAccountModel.findOne({
          instagramAccountId: account.id,
        });

        if (existing) {
          await this.instagramAccountModel.updateOne(
            { instagramAccountId: account.id },
            {
              $set: {
                username: account.username,
                accountType: account.account_type,
                followersCount: account.followers_count,
                pageId: account.pageId,
                updatedAt: new Date(),
              },
            },
          );
        } else {
          await this.instagramAccountModel.create({
            userId,
            instagramAccountId: account.id,
            username: account.username,
            accountType: account.account_type,
            followersCount: account.followers_count,
            pageId: account.pageId,
          });
        }

        // Update the Facebook page with the connected Instagram account
        await this.facebookPageModel.updateOne(
          { pageId: account.pageId },
          {
            $set: {
              connectedInstagramAccountId: account.id,
            },
          },
        );
      }
    } catch (error) {
      this.logger.error('Failed to persist Instagram accounts', error);
      throw new InternalServerErrorException('Error saving Instagram accounts');
    }
  }

  async getUserInstagramAccountsWithStatus(userId: string): Promise<{
    instagramAccounts: any[];
    hasPrimary: boolean;
    total: number;
  }> {
    try {
      const instagramAccounts = await this.instagramAccountModel
        .find({ userId })
        .sort({ isPrimary: -1, username: 1 })
        .populate('pageId', 'pageName pageId')
        .lean();

      const hasPrimary = instagramAccounts.some((account) => account.isPrimary);

      return {
        instagramAccounts,
        hasPrimary,
        total: instagramAccounts.length,
      };
    } catch (error) {
      this.logger.error('Failed to get user Instagram accounts', error);
      throw new InternalServerErrorException(
        'Failed to fetch Instagram accounts',
      );
    }
  }

  async selectPrimaryInstagramAccount(
    userId: string,
    instagramAccountId: string,
  ): Promise<any> {
    try {
      // Validate that the Instagram account belongs to the user
      const instagramAccount = await this.instagramAccountModel.findOne({
        userId,
        instagramAccountId,
      });

      if (!instagramAccount) {
        throw new BadRequestException(
          'Instagram account not found or does not belong to user',
        );
      }

      // Remove primary flag from all user's Instagram accounts
      await this.instagramAccountModel.updateMany(
        { userId },
        { $set: { isPrimary: false } },
      );

      // Set the selected account as primary
      await this.instagramAccountModel.updateOne(
        { userId, instagramAccountId },
        { $set: { isPrimary: true, updatedAt: new Date() } },
      );

      // Get the page connected to this Instagram account
      const page = await this.facebookPageModel.findOne({
        pageId: instagramAccount.pageId,
      });

      return {
        instagramAccountId,
        username: instagramAccount.username,
        pageId: page?.pageId,
        pageName: page?.pageName,
      };
    } catch (error) {
      this.logger.error('Failed to select primary Instagram account', error);
      throw new InternalServerErrorException(
        'Failed to select primary Instagram account',
      );
    }
  }

  async getPrimaryInstagramAccount(userId: string): Promise<any> {
    try {
      let primaryAccount = await this.instagramAccountModel
        .findOne({ userId, isPrimary: true })
        .populate('pageId', 'pageName pageId')
        .lean();

      // If no primary is set, return the first one (if any)
      if (!primaryAccount) {
        const firstAccount = await this.instagramAccountModel
          .findOne({ userId })
          .populate('pageId', 'pageName pageId')
          .lean();

        if (firstAccount) {
          // Auto-set it as primary
          await this.selectPrimaryInstagramAccount(
            userId,
            firstAccount.instagramAccountId,
          );
          primaryAccount = { ...firstAccount, isPrimary: true };
        }
      }

      return primaryAccount;
    } catch (error) {
      this.logger.error('Failed to get primary Instagram account', error);
      throw new InternalServerErrorException(
        'Failed to get primary Instagram account',
      );
    }
  }

  // Add this method to get the primary Instagram account for campaigns
  async getPrimaryInstagramAccountForCampaigns(userId: string): Promise<{
    instagramAccountId: string;
    username: string;
    pageId: string;
  }> {
    try {
      const primaryAccount = await this.instagramAccountModel
        .findOne({
          userId,
          isPrimary: true,
        })
        .populate('pageId', 'pageName pageId')
        .lean();

      if (!primaryAccount) {
        throw new NotFoundException(
          `User ${userId} has no primary Instagram account. Please select an Instagram account first.`,
        );
      }

      return {
        instagramAccountId: primaryAccount.instagramAccountId,
        username: primaryAccount.username,
        pageId: primaryAccount.pageId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get primary Instagram account for campaigns: user ${userId}`,
        error,
      );
      throw error;
    }
  }

  async getInstagramSetupStatus(userId: string): Promise<{
    hasInstagramAccounts: boolean;
    instagramAccountCount: number;
    pagesWithInstagramCount: number;
    pagesWithoutInstagramCount: number;
    pagesWithoutInstagram: Array<{
      pageId: string;
      pageName: string;
    }>;
    instagramAccounts: Array<{
      instagramAccountId: string;
      username: string;
      pageId: string;
      pageName?: string;
      isPrimary: boolean;
    }>;
  }> {
    try {
      // Get user's Instagram accounts
      const instagramAccounts = await this.instagramAccountModel.find({
        userId,
      });

      // Get user's Facebook pages
      const pages = await this.facebookPageModel.find({ userId });

      // Check which pages have Instagram accounts
      const pagesWithInstagram = new Set(
        instagramAccounts.map((ig) => ig.pageId),
      );

      const pagesWithoutInstagram = pages.filter(
        (page) => !pagesWithInstagram.has(page.pageId),
      );

      return {
        hasInstagramAccounts: instagramAccounts.length > 0,
        instagramAccountCount: instagramAccounts.length,
        pagesWithInstagramCount: pagesWithInstagram.size,
        pagesWithoutInstagramCount: pagesWithoutInstagram.length,
        pagesWithoutInstagram: pagesWithoutInstagram.map((p) => ({
          pageId: p.pageId,
          pageName: p.pageName,
        })),
        instagramAccounts: instagramAccounts.map((ig) => ({
          instagramAccountId: ig.instagramAccountId,
          username: ig.username,
          pageId: ig.pageId,
          pageName: pages.find((p) => p.pageId === ig.pageId)?.pageName,
          isPrimary: ig.isPrimary,
        })),
      };
    } catch (error) {
      this.logger.error('Failed to get Instagram setup status', error);
      throw new InternalServerErrorException(
        'Failed to get Instagram setup status',
      );
    }
  }

  async generateMetaPixelId(
    adAccountId: string,
    userId: string,
    metaPixelName: string,
  ): Promise<string> {
    try {
      // first check if ad account exists and belongs to the user
      const adAccount = await this.facebookAdAccountModel.findOne({
        accountId: adAccountId,
        userId: userId,
      });

      if (!adAccount) {
        throw new NotFoundException('Ad account not found');
      }

      const query = new URLSearchParams({
        name: metaPixelName,
      });

      const pixelResponse = await this.graph.post<{ id: string }>(
        `/${adAccountId}/adspixel?${query.toString()}`,
      );

      const metaPixelId = pixelResponse.data.id;

      // update ad account model with the pixel id on the metaPixelId field
      await this.facebookAdAccountModel.updateOne(
        {
          accountId: adAccountId,
          userId: userId,
        },
        {
          metaPixelId: metaPixelId,
        },
      );

      return metaPixelId;
    } catch (error) {
      const message = error?.message ?? 'Something went wrong';
      this.logger.error(`::: Error generating MetaPixel Id => ${error} :::`);
      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Get user's primary ad account that's ready for campaign creation
   * Used by Lambda functions for campaign creation
   */
  async getPrimaryAdAccountForCampaigns(userId: string): Promise<{
    accountId: string;
    pageId: string;
    metaPixelId: string;
    name?: string;
    currency?: string;
    integrationStatus: string;
  }> {
    try {
      this.logger.debug(
        `Getting primary ad account for campaigns: user ${userId}`,
      );

      // Get primary ad account that's ready for campaigns
      const primaryAdAccount = await this.facebookAdAccountModel
        .findOne({
          userId,
          isPrimary: true,
          integrationStatus: 'READY_FOR_CAMPAIGNS', // Must be ready for campaigns
        })
        .lean();

      // also fetch primary page for the campaign
      const primaryPage = await this.facebookPageModel
        .findOne({
          userId,
          _id: new mongoose.Types.ObjectId(
            primaryAdAccount?.selectedPrimaryFacebookPageId,
          ),
          isPrimaryPage: true,
        })
        .lean();

      // throw individual errors for clarity

      if (!primaryAdAccount) {
        throw new NotFoundException(
          `User ${userId} has no ready Facebook ad account for campaigns. Please set up ad account first.`,
        );
      }

      if (!primaryAdAccount.metaPixelId) {
        throw new BadRequestException(
          `User ${userId} has no configured Meta Pixel ID for ad account ${primaryAdAccount.accountId}.`,
        );
      }

      if (!primaryPage) {
        throw new NotFoundException(
          `User ${userId} has no ready Facebook page for campaigns. Please select a page for Ads`,
        );
      }

      return {
        accountId: primaryAdAccount.accountId,
        pageId: primaryPage._id.toString(),
        metaPixelId: primaryAdAccount.metaPixelId,
        name: primaryAdAccount.name,
        currency: primaryAdAccount.currency,
        integrationStatus: primaryAdAccount.integrationStatus,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get primary ad account for campaigns: user ${userId}`,
        error,
      );
      throw error;
    }
  }
}
