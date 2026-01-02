import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

import { GoogleAdsAuthApiService } from '../api/auth-api/auth.api';
import { GoogleAdsCustomerApiService } from '../api/customer-api/customer.api';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class GoogleAdsAuthService {
  private logger = new Logger(GoogleAdsAuthService.name);
  constructor(
    private jwtService: JwtService,
    private googleAdsAuthApiService: GoogleAdsAuthApiService,
    private config: AppConfigService,
    private googleAdsCustomerApi: GoogleAdsCustomerApiService,
  ) {}

  async getGoogleAuthUrl(userId: string): Promise<string> {
    const state = this.generateStateToken({ userId });
    return this.googleAdsAuthApiService.getGoogleAuthUrl(state);
  }

  async googleAuthCallbackHandler(params: any) {
    try {
      const { code, state } = params;

      // validate state
      const { userId } = this.validateStateToken(state);

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

      // TODO- save tokens to db with user infomation and profile
      // TODO- encrypt refresh token
      // TODO- save refresh token to db

      return { tokensData, googleProfile };
    } catch (error) {
      this.logger.error('Error occurred:', error);
      throw new InternalServerErrorException();
    }
  }

  async listAccessibleCustomers() {
    return await this.googleAdsCustomerApi.listAccessibleCustomers();
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
