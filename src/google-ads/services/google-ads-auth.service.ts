import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

import { GoogleAdsAuthApiService } from '../api/auth-api/auth.api';
import { GoogleAdsCustomerApiService } from '../api/customer-api/customer.api';
import { JwtService } from '@nestjs/jwt';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppConfigService } from 'src/config/config.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { GoogleAdsAccountDoc } from 'src/database/schema/google-ads-account.schema';
import { Business } from 'src/database/schema';

@Injectable()
export class GoogleAdsAuthService {
  private logger = new Logger(GoogleAdsAuthService.name);
  constructor(
    private jwtService: JwtService,
    private googleAdsAuthApiService: GoogleAdsAuthApiService,
    private config: AppConfigService,
    private googleAdsCustomerApi: GoogleAdsCustomerApiService,
    @InjectModel('google-ads-accounts')
    private googleAdsAccountModel: Model<GoogleAdsAccountDoc>,
    @InjectModel('business')
    private businessModel: Model<Business>,
  ) {}

  async getGoogleAuthUrl(userId: string): Promise<string> {
    const state = this.generateStateToken({ userId });
    return this.googleAdsAuthApiService.getGoogleAuthUrl(state);
  }

  async googleAuthCallbackHandler(params: any) {
    try {
      const { code, state, userId: userIdOverride } = params;

      // validate state
      const { userId: userIdFromState } = this.validateStateToken(state);

      if (userIdOverride && userIdOverride !== userIdFromState) {
        this.logger.error('State userId and Request token userId mismatch', {
          userIdOverride,
          userIdFromState,
        });
        throw new UnauthorizedException('Invalid state');
      }

      if (!userIdOverride && !userIdFromState) {
        throw new UnauthorizedException('Invalid state');
      }

      const userId = (userIdOverride as string | undefined) ?? userIdFromState;
      const userObjectId = new Types.ObjectId(userId);

      // get token
      const tokensData =
        await this.googleAdsAuthApiService.getOauthTokensWithCode(
          code as string,
        );

      // get user information
      const googleProfile =
        await this.googleAdsAuthApiService.getGoogleUserProfile({
          accessToken: tokensData.access_token,
          idToken: tokensData.id_token,
        });

      const accessibleCustomers =
        await this.googleAdsCustomerApi.listAccessibleCustomersWithAccessToken({
          accessToken: tokensData.access_token,
        });
      const accessibleCustomerResourceNames =
        accessibleCustomers.resourceNames || [];

      const existing = await this.googleAdsAccountModel.findOne({
        userId: userObjectId,
        googleUserId: googleProfile.id,
      });

      const existingPrimaryCustomerAccount = existing?.primaryCustomerAccount;
      const primaryAdAccountState =
        existingPrimaryCustomerAccount &&
        !accessibleCustomerResourceNames.includes(
          existingPrimaryCustomerAccount,
        )
          ? 'DISCONNECTED'
          : 'CONNECTED';

      const refreshToken = tokensData.refresh_token || existing?.refreshToken;
      if (!refreshToken) {
        throw new UnauthorizedException('Missing refresh token');
      }

      const googleAdsAccount =
        await this.googleAdsAccountModel.findOneAndUpdate(
          { userId: userObjectId, googleUserId: googleProfile.id },
          {
            $set: {
              userId: userObjectId,
              googleUserId: googleProfile.id,
              email: googleProfile.email,
              refreshToken,
              accessToken: tokensData.access_token,
              accessTokenExpiresAt: new Date(
                Date.now() + (tokensData.expires_in || 0) * 1000,
              ),
              accessibleCustomers: accessibleCustomerResourceNames,
              primaryAdAccountState,
            },
            $setOnInsert: {
              primaryCustomerAccount:
                accessibleCustomerResourceNames?.[0] ?? undefined,
            },
          },
          { upsert: true, new: true },
        );

      await this.businessModel.updateOne(
        { userId: userObjectId },
        {
          $set: {
            'integrations.googleAds.primaryAdAccountConnection':
              googleAdsAccount?._id,
          },
        },
        { upsert: true, setDefaultsOnInsert: true },
      );

      return {
        tokensData,
        googleProfile,
        accessibleCustomers,
      };
    } catch (error) {
      this.logger.error('Error occurred:', error);
      throw new InternalServerErrorException();
    }
  }

  private generateStateToken(params: { userId: string }) {
    return this.jwtService.sign(
      { userId: params.userId },
      {
        secret: this.config.get('OAUTH_STATE_SECRET'),
        expiresIn: '10m',
      },
    );
  }

  private validateStateToken(token: string): { userId: string } {
    try {
      this.logger.debug('::: Validating state token :::');
      return this.jwtService.verify(token, {
        secret: this.config.get('OAUTH_STATE_SECRET'),
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
}
