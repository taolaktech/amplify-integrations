import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Business } from 'src/database/schema';
import { GoogleAdsAccountDoc } from 'src/database/schema/google-ads-account.schema';
import { GoogleAdsCustomerApiService } from '../api/customer-api/customer.api';
import { DateTime } from 'luxon';

@Injectable()
export class GoogleAdsCustomersService {
  constructor(
    @InjectModel('business')
    private businessModel: Model<Business>,
    @InjectModel('google-ads-accounts')
    private googleAdsAccountModel: Model<GoogleAdsAccountDoc>,
    private googleAdsCustomerApi: GoogleAdsCustomerApiService,
  ) {}

  async getPrimaryConnectionCustomers(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const business = await this.businessModel.findOne({ userId: userObjectId });
    const primaryConnectionId =
      business?.integrations?.googleAds?.primaryAdAccountConnection;

    if (!primaryConnectionId) {
      throw new NotFoundException('Primary Google Ads connection not found');
    }

    const connection =
      await this.googleAdsAccountModel.findById(primaryConnectionId);

    if (!connection) {
      throw new NotFoundException('Google Ads connection not found');
    }

    const lastFetchAt = connection.lastAccessibleCustomersFetchAt
      ? DateTime.fromJSDate(connection.lastAccessibleCustomersFetchAt)
      : undefined;
    const shouldFetch =
      !lastFetchAt || DateTime.now().diff(lastFetchAt, 'minutes').minutes >= 5;

    if (shouldFetch) {
      const accessibleCustomers =
        await this.googleAdsCustomerApi.listAccessibleCustomers({
          connectionId: connection._id.toString(),
        });
      const accessibleCustomerResourceNames =
        accessibleCustomers.resourceNames || [];

      const primaryAdAccountState =
        connection.primaryCustomerAccount &&
        !accessibleCustomerResourceNames.includes(
          connection.primaryCustomerAccount,
        )
          ? 'DISCONNECTED'
          : 'CONNECTED';

      const updated = await this.googleAdsAccountModel.findByIdAndUpdate(
        connection._id,
        {
          $set: {
            accessibleCustomers: accessibleCustomerResourceNames,
            primaryAdAccountState,
            lastAccessibleCustomersFetchAt: DateTime.now().toJSDate(),
          },
        },
        { new: true },
      );

      if (updated) {
        return {
          connectionId: updated._id,
          googleUserId: updated.googleUserId,
          email: updated.email,
          primaryCustomerAccount: updated.primaryCustomerAccount,
          primaryAdAccountState: updated.primaryAdAccountState,
          accessibleCustomers: updated.accessibleCustomers,
          lastAccessibleCustomersFetchAt:
            updated.lastAccessibleCustomersFetchAt,
        };
      }
    }

    return {
      connectionId: connection._id,
      googleUserId: connection.googleUserId,
      email: connection.email,
      primaryCustomerAccount: connection.primaryCustomerAccount,
      primaryAdAccountState: connection.primaryAdAccountState,
      accessibleCustomers: connection.accessibleCustomers,
      lastAccessibleCustomersFetchAt: connection.lastAccessibleCustomersFetchAt,
    };
  }

  async setPrimaryCustomerAccount(params: {
    userId: string;
    primaryCustomerAccount: string;
  }) {
    const { userId, primaryCustomerAccount } = params;
    if (!primaryCustomerAccount) {
      throw new BadRequestException('primaryCustomerAccount is required');
    }

    const userObjectId = new Types.ObjectId(userId);
    const business = await this.businessModel.findOne({ userId: userObjectId });
    const primaryConnectionId =
      business?.integrations?.googleAds?.primaryAdAccountConnection;

    if (!primaryConnectionId) {
      throw new NotFoundException('Primary Google Ads connection not found');
    }

    const connection =
      await this.googleAdsAccountModel.findById(primaryConnectionId);
    if (!connection) {
      throw new NotFoundException('Google Ads connection not found');
    }

    const primaryAdAccountState = connection.accessibleCustomers?.includes(
      primaryCustomerAccount,
    )
      ? 'CONNECTED'
      : 'DISCONNECTED';

    const updated = await this.googleAdsAccountModel.findByIdAndUpdate(
      connection._id,
      {
        $set: {
          primaryCustomerAccount,
          primaryAdAccountState,
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException('Google Ads connection not found');
    }

    return {
      connectionId: updated._id,
      googleUserId: updated.googleUserId,
      email: updated.email,
      primaryCustomerAccount: updated.primaryCustomerAccount,
      primaryAdAccountState: updated.primaryAdAccountState,
      accessibleCustomers: updated.accessibleCustomers,
      lastAccessibleCustomersFetchAt: updated.lastAccessibleCustomersFetchAt,
    };
  }

  async listAccessibleCustomersForConnection(params: {
    connectionId?: string;
    userId?: string;
  }) {
    const { connectionId, userId } = params;

    if (connectionId) {
      return await this.googleAdsCustomerApi.listAccessibleCustomers({
        connectionId,
      });
    }

    if (!userId) {
      throw new BadRequestException('connectionId or userId is required');
    }

    const userObjectId = new Types.ObjectId(userId);
    const business = await this.businessModel.findOne({ userId: userObjectId });
    const primaryConnectionId =
      business?.integrations?.googleAds?.primaryAdAccountConnection;

    if (!primaryConnectionId) {
      throw new NotFoundException('Primary Google Ads connection not found');
    }

    return await this.googleAdsCustomerApi.listAccessibleCustomers({
      connectionId: primaryConnectionId.toString(),
    });
  }
}
