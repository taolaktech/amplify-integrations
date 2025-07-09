import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FacebookPage } from '../../database/schema/facebook-page.schema';
import { Model } from 'mongoose';
import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt';

@Injectable()
export class FacebookAuthService {
  private readonly logger = new Logger(FacebookAuthService.name);

  private readonly graph = axios.create({
    baseURL: 'https://graph.facebook.com/v23.0',
  });

  constructor(
    @InjectModel('facebook-pages')
    private facebookPageModel: Model<FacebookPage>,
    private config: ConfigService,
    private jwtService: JwtService,
  ) {}

  getAuthRedirectURL(state: string): string {
    const FACEBOOK_APP_ID = this.config.get<string>(
      'FACEBOOK_APP_ID',
    ) as string;
    const FACEBOOK_REDIRECT_URI = this.config.get<string>(
      'FACEBOOK_REDIRECT_URI',
    ) as string;
    const query = new URLSearchParams({
      client_id: FACEBOOK_APP_ID,
      redirect_uri: FACEBOOK_REDIRECT_URI,
      scope: [
        // 'pages_show_list', // unavailable for now, until App is approved
        'email',
        'public_profile',
        // 'pages_manage_ads',
        // 'ads_management',
        // 'business_management',
      ].join(','),
      response_type: 'code',
      state,
    });

    return `https://www.facebook.com/v23.0/dialog/oauth?${query.toString()}`;
  }

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

  generateStateToken(userId: string): string {
    return this.jwtService.sign(
      { userId },
      {
        secret: this.config.get<string>('OAUTH_STATE_SECRET') as string,
        expiresIn: '10m',
      },
    );
  }

  verifyStateToken(token: string): { userId: string } {
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
}
