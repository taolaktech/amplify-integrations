import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as querystring from 'querystring';
import { AppConfigService } from 'src/config/config.service';
import { GoogleTokensResult } from './resource-api/types';

@Injectable()
export class GoogleAdsSharedMethodsService {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_ADS_DEVELOPER_TOKEN: string;
  GOOGLE_ADS_API_URL = 'https://googleads.googleapis.com';
  GOOGLE_ADS_VERSION = 'v20';

  constructor(private config: AppConfigService) {
    this.GOOGLE_CLIENT_ID = this.config.get('GOOGLE_CLIENT_ID');
    this.GOOGLE_CLIENT_SECRET = this.config.get('GOOGLE_CLIENT_SECRET');
    this.GOOGLE_ADS_DEVELOPER_TOKEN = this.config.get(
      'GOOGLE_ADS_DEVELOPER_TOKEN',
    );
  }

  axiosInstanceWithAccessToken(params: {
    accessToken: string;
    loginCustomerId?: string;
  }) {
    return axios.create({
      baseURL: `${this.GOOGLE_ADS_API_URL}/${this.GOOGLE_ADS_VERSION}`,
      headers: {
        'developer-token': this.GOOGLE_ADS_DEVELOPER_TOKEN,
        ...(params.loginCustomerId
          ? { 'login-customer-id': params.loginCustomerId }
          : {}),
        Authorization: `Bearer ${params.accessToken}`,
      },
    });
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
}
