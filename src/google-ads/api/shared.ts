import { BadRequestException, Injectable } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
import * as querystring from 'querystring';
import { AppConfigService } from 'src/config/config.service';
import { GoogleTokensResult } from './resource-api/types';
import { Logger } from '@nestjs/common';

@Injectable()
export class GoogleAdsSharedMethodsService {
  private logger = new Logger(GoogleAdsSharedMethodsService.name);
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_ADS_DEVELOPER_TOKEN: string;
  GOOGLE_ADS_OAUTH_REDIRECT_URL: string;
  GOOGLE_ADS_API_URL = 'https://googleads.googleapis.com';
  GOOGLE_ADS_VERSION = 'v20';

  constructor(private config: AppConfigService) {
    this.GOOGLE_CLIENT_ID = this.config.get('GOOGLE_CLIENT_ID');
    this.GOOGLE_CLIENT_SECRET = this.config.get('GOOGLE_CLIENT_SECRET');
    this.GOOGLE_ADS_DEVELOPER_TOKEN = this.config.get(
      'GOOGLE_ADS_DEVELOPER_TOKEN',
    );
    this.GOOGLE_ADS_OAUTH_REDIRECT_URL = `${this.config.get('API_URL')}/api/google-ads/auth/redirect`;
  }

  private normalizeLoginCustomerId(value: string) {
    const raw = String(value || '').trim();
    if (!raw) {
      throw new BadRequestException('loginCustomerId is required');
    }
    const match = raw.match(/^customers\/(\d+)$/i);
    const numeric = match ? match[1] : raw;
    if (!/^\d+$/.test(numeric)) {
      throw new BadRequestException(
        `Invalid loginCustomerId format: ${String(value)}`,
      );
    }
    return numeric;
  }

  axiosInstanceWithAccessToken(params: {
    accessToken: string;
    loginCustomerId?: string;
  }) {
    const loginCustomerId = params.loginCustomerId
      ? this.normalizeLoginCustomerId(params.loginCustomerId)
      : undefined;
    return axios.create({
      baseURL: `${this.GOOGLE_ADS_API_URL}/${this.GOOGLE_ADS_VERSION}`,
      headers: {
        'developer-token': this.GOOGLE_ADS_DEVELOPER_TOKEN,
        ...(loginCustomerId ? { 'login-customer-id': loginCustomerId } : {}),
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
      redirect_uri: this.GOOGLE_ADS_OAUTH_REDIRECT_URL,
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
      if (err?.response?.data) {
        this.logger.error(err?.response?.data);
      } else {
        this.logger.error(err);
      }
      throw err;
    }
  }
}
