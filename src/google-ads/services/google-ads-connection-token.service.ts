import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DateTime } from 'luxon';
import { GoogleAdsAccountDoc } from 'src/database/schema/google-ads-account.schema';
import { GoogleAdsSharedMethodsService } from '../api/shared';

@Injectable()
export class GoogleAdsConnectionTokenService {
  constructor(
    @InjectModel('google-ads-accounts')
    private googleAdsAccountModel: Model<GoogleAdsAccountDoc>,
    private googleAdsSharedMethodsService: GoogleAdsSharedMethodsService,
  ) {}

  private normalizeCustomerId(value?: string) {
    const raw = String(value || '').trim();
    const match = raw.match(/^customers\/(\d+)$/i);
    return match ? match[1] : raw;
  }

  async getAuthContext(params: { connectionId: string }): Promise<{
    accessToken: string;
    loginCustomerId: string;
  }> {
    const connectionObjectId = new Types.ObjectId(params.connectionId);
    const account =
      await this.googleAdsAccountModel.findById(connectionObjectId);

    if (!account) {
      throw new NotFoundException('Google Ads connection not found');
    }

    const loginCustomerId = this.normalizeCustomerId(
      account.primaryCustomerAccount,
    );
    if (!loginCustomerId) {
      throw new BadRequestException(
        'Google Ads connection is missing primaryCustomerAccount',
      );
    }

    const accessToken = await this.getAccessToken(params);
    return { accessToken, loginCustomerId };
  }

  async getAccessToken(params: { connectionId: string }): Promise<string> {
    const connectionObjectId = new Types.ObjectId(params.connectionId);
    const account =
      await this.googleAdsAccountModel.findById(connectionObjectId);

    if (!account) {
      throw new NotFoundException('Google Ads connection not found');
    }

    const expiresAt = account.accessTokenExpiresAt
      ? DateTime.fromJSDate(account.accessTokenExpiresAt)
      : undefined;

    const hasValidAccessToken =
      !!account.accessToken &&
      !!expiresAt &&
      DateTime.now().plus({ seconds: 10 }) < expiresAt;

    if (hasValidAccessToken) {
      return account.accessToken as string;
    }

    const tokens =
      await this.googleAdsSharedMethodsService.getGoogleAccessTokenCall({
        refreshToken: account.refreshToken,
        grantType: 'refresh_token',
      });

    const updated = await this.googleAdsAccountModel.findByIdAndUpdate(
      connectionObjectId,
      {
        $set: {
          accessToken: tokens.access_token,
          accessTokenExpiresAt: new Date(
            Date.now() + (tokens.expires_in || 0) * 1000,
          ),
        },
      },
      { new: true },
    );

    if (!updated?.accessToken) {
      throw new NotFoundException('Google Ads connection not found');
    }

    return updated.accessToken;
  }
}
