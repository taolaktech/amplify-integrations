import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { AppConfigService } from 'src/config/config.service';
import { GoogleAdsSharedMethodsService } from '../shared';
import axios from 'axios';

type GoogleProfile = {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
};

@Injectable()
export class GoogleAdsAuthApiService {
  private logger = new Logger(GoogleAdsAuthApiService.name);
  private oauth2Client: OAuth2Client;
  private GOOGLE_CLIENT_ID: string;
  private GOOGLE_CLIENT_SECRET: string;

  constructor(
    private config: AppConfigService,
    private googleAdsSharedMethodsService: GoogleAdsSharedMethodsService,
  ) {
    this.GOOGLE_CLIENT_ID = this.config.get('GOOGLE_CLIENT_ID');
    this.GOOGLE_CLIENT_SECRET = this.config.get('GOOGLE_CLIENT_SECRET');

    this.oauth2Client = new google.auth.OAuth2(
      this.GOOGLE_CLIENT_ID,
      this.GOOGLE_CLIENT_SECRET,
      `${this.config.get('API_URL')}/api/google/auth/redirect`,
    );
  }

  getGoogleAuthUrl(state: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/adwords',
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
    ];

    // Generate a url that asks permissions for the Drive activity scope
    const authorizationUrl = this.oauth2Client.generateAuthUrl({
      // 'online' (default) or 'offline' (gets refresh_token)
      access_type: 'offline',
      /** Pass in the scopes array defined above.
       * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
      scope: scopes,
      // Enable incremental authorization. Recommended as a best practice.
      include_granted_scopes: true,
      state,
      prompt: 'consent',
    });
    return authorizationUrl;
  }

  async getOauthTokensWithCode(code: string) {
    try {
      const tokensData =
        await this.googleAdsSharedMethodsService.getGoogleAccessTokenCall({
          code,
          grantType: 'authorization_code',
        });
      return tokensData;
    } catch (err: any) {
      this.logger.error('Error getting tokens', err);
      throw err;
    }
  }

  async getGoogleUserProfile(params: { accessToken: string; idToken: string }) {
    try {
      const response = await axios.get<GoogleProfile>(
        `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${params.accessToken}`,
        {
          headers: {
            Authorization: `Bearer ${params.idToken}`,
          },
        },
      );
      return response.data;
    } catch (error: any) {
      this.logger.error('Error getting google profile', error);
      throw error;
    }
  }
}
