import { Injectable, InternalServerErrorException } from '@nestjs/common';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import * as querystring from 'querystring';
import { AppConfigService } from 'src/config/config.service';

type GoogleTokensResult = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
  id_token: string;
};

@Injectable()
export class GoogleAdsService {
  private GOOGLE_CLIENT_ID: string;
  private GOOGLE_CLIENT_SECRET: string;
  private oauth2Client: OAuth2Client;

  constructor(private config: AppConfigService) {
    this.GOOGLE_CLIENT_ID = this.config.get('GOOGLE_CLIENT_ID');
    this.GOOGLE_CLIENT_SECRET = this.config.get('GOOGLE_CLIENT_SECRET');
    this.oauth2Client = new google.auth.OAuth2(
      this.GOOGLE_CLIENT_ID,
      this.GOOGLE_CLIENT_SECRET,
      `${this.config.get('API_URL')}/api/google/auth/redirect`,
    );
  }

  getGoogleAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.profile',
      'openid',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/adwords',
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
      state: 'state_parameter_passthrough_value',
      prompt: 'consent',
    });
    return authorizationUrl;
  }

  async googleAuthCallbackHandler(params: any) {
    try {
      const { code }: any = params;

      // get tokens
      const tokens = await this.getOauthTokensWithCode(code as string);

      const { refresh_token } = tokens;

      return { refresh_token };
    } catch (error) {
      console.log('Error occurred:', error);
      throw new InternalServerErrorException();
    }
  }

  private async getGoogleAccessTokenCall(params: {
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
      redirect_uri: `${this.config.get('API_URL')}/api/google/auth/redirect`,
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

  async getOauthTokensWithCode(code: string) {
    try {
      const tokensData = await this.getGoogleAccessTokenCall({
        code,
        grantType: 'authorization_code',
      });
      return tokensData;
    } catch (err: any) {
      console.error('error getting tokens');
      throw err;
    }
  }

  async getAccessTokenFromRefreshToken(refreshToken: string) {
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

  async apiCall() {
    //   curl -i -X POST https://googleads.googleapis.com/v19/customers/CUSTOMER_ID/googleAds:searchStream \
    //  -H "Content-Type: application/json" \
    //  -H "Authorization: Bearer ACCESS_TOKEN" \
    //  -H "developer-token: DEVELOPER_TOKEN" \
    //  -H "login-customer-id: LOGIN_CUSTOMER_ID" \
    //  --data-binary "@query.json"
    // const url = `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:searchStream`;
    // const headers = {
    //   'Content-Type': 'application/json',
    //   Authorization: `Bearer ${accessToken}`,
    //   'developer-token': developerToken,
    //   'login-customer-id': customerId,
    // };
    // const res = await axios.post(url, {}, { headers });
    // return res.data;
  }
}
