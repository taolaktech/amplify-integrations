import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import axios from 'axios';
import * as querystring from 'querystring';
import { AppConfigService } from 'src/config/config.service';
import { GoogleTokensResult } from './resource-api/types';

@Injectable()
export class GoogleAdsSharedMethodsService {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_ADS_REFRESH_TOKEN: string;
  GOOGLE_ADS_DEVELOPER_TOKEN: string;
  GOOGLE_ADS_API_URL = 'https://googleads.googleapis.com';
  GOOGLE_ADS_VERSION = 'v20';
  GOOGLE_ADS_LOGIN_CUSTOMER_ID: string;

  private googleAdsAccessToken: string;
  private googleAdsAccessTokenExpiresAt: DateTime;

  constructor(private config: AppConfigService) {
    this.GOOGLE_CLIENT_ID = this.config.get('GOOGLE_CLIENT_ID');
    this.GOOGLE_CLIENT_SECRET = this.config.get('GOOGLE_CLIENT_SECRET');
    this.GOOGLE_ADS_DEVELOPER_TOKEN = this.config.get(
      'GOOGLE_ADS_DEVELOPER_TOKEN',
    );
    this.GOOGLE_ADS_LOGIN_CUSTOMER_ID = this.config.get(
      'GOOGLE_ADS_LOGIN_CUSTOMER_ID',
    );
    this.GOOGLE_ADS_REFRESH_TOKEN = this.config.get('GOOGLE_ADS_REFRESH_TOKEN');

    this.googleAdsAccessTokenExpiresAt = DateTime.now().minus({ days: 1 });
  }

  async axiosInstance() {
    const accessToken = await this.getAccessToken();
    return axios.create({
      baseURL: `${this.GOOGLE_ADS_API_URL}/${this.GOOGLE_ADS_VERSION}`,
      headers: {
        'developer-token': this.GOOGLE_ADS_DEVELOPER_TOKEN,
        'login-customer-id': this.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async getAccessToken() {
    if (DateTime.now() > this.googleAdsAccessTokenExpiresAt) {
      const { access_token, expires_in } =
        await this.getAccessTokenFromRefreshToken(
          this.GOOGLE_ADS_REFRESH_TOKEN,
        );
      this.googleAdsAccessToken = access_token;
      this.googleAdsAccessTokenExpiresAt = DateTime.now().plus({
        seconds: expires_in - 10,
      });
      return access_token;
    } else {
      return this.googleAdsAccessToken;
    }
  }

  async getGoogleAccessTokenCall(params: {
    code?: string;
    refreshToken?: string;
    grantType: 'refresh_token' | 'authorization_code';
  }) {
    const values = {
      client_id: this.GOOGLE_CLIENT_ID,
      client_secret: this.GOOGLE_CLIENT_SECRET,
      grant_type: params.grantType,
      refresh_token: params.refreshToken,
      code: params.code,
      redirect_uri: `${this.config.get('API_URL')}/api/google-ads/auth/redirect`,
    };
    try {
      const response = await axios.post<GoogleTokensResult>(
        'https://oauth2.googleapis.com/token',
        querystring.stringify(values),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      return response.data;
    } catch (err: any) {
      console.error('error getting tokens');
      throw err;
    }
  }

  private async getAccessTokenFromRefreshToken(refreshToken: string) {
    try {
      const tokensData = await this.getGoogleAccessTokenCall({
        refreshToken,
        grantType: 'refresh_token',
      });
      return tokensData;
    } catch (err: any) {
      console.error('error getting tokens');
      throw err;
    }
  }
}
