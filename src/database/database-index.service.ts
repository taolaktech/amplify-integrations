// src/database/database-index.service.ts
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FacebookAdAccount,
  FacebookCampaign,
  InstagramAccount,
} from './schema';

@Injectable()
export class DatabaseIndexService implements OnApplicationBootstrap {
  constructor(
    @InjectModel('facebook-campaigns')
    private readonly facebookCampaignModel: Model<FacebookCampaign>,
    @InjectModel('facebook-ad-accounts')
    private readonly facebookAdAccountModel: Model<FacebookAdAccount>,
    @InjectModel('instagram-accounts')
    private readonly instagramAccountModel: Model<InstagramAccount>,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.ensureCorrectIndexes();
    } catch (error) {
      console.error('Failed to ensure correct indexes:', error);
    }
  }

  private async ensureCorrectIndexes() {
    await this.ensureFacebookCampaignIndexes();
    await this.ensureFacebookAdAccountIndexes();
    await this.ensureInstagramAccountIndexes();
  }

  private async ensureFacebookCampaignIndexes() {
    const collection = this.facebookCampaignModel.collection;

    const indexes = await collection.indexes();
    console.log(
      'Current facebook-campaigns indexes:',
      JSON.stringify(indexes, null, 2),
    );

    const oldIndexes = indexes.filter(
      (index) =>
        index.unique === true &&
        index.key &&
        Object.keys(index.key).length === 1 &&
        index.key.campaignId === 1,
    );

    const newIndexExists = indexes.some(
      (index) =>
        index.unique === true &&
        index.key &&
        index.key.campaignId === 1 &&
        index.key.platform === 1,
    );

    for (const oldIndex of oldIndexes) {
      try {
        console.log(`Dropping old facebook-campaigns index: ${oldIndex.name}`);
        await collection.dropIndex(oldIndex.name as unknown as any);
      } catch (error) {
        console.error(
          `Failed to drop facebook-campaigns index ${oldIndex.name}:`,
          error,
        );
      }
    }

    if (!newIndexExists) {
      try {
        console.log('Creating facebook-campaigns composite index...');
        await collection.createIndex(
          { campaignId: 1, platform: 1 },
          { unique: true, name: 'campaignId_1_platform_1' },
        );
        console.log('Created facebook-campaigns composite index');
      } catch (error) {
        console.error(
          'Failed to create facebook-campaigns composite index:',
          error,
        );
      }
    } else {
      console.log('Facebook-campaigns composite index already exists');
    }
  }

  private async ensureFacebookAdAccountIndexes() {
    const collection = this.facebookAdAccountModel.collection;

    const indexes = await collection.indexes();
    console.log(
      'Current facebook-ad-accounts indexes:',
      JSON.stringify(indexes, null, 2),
    );

    // Drop any old *unique* index that only keys on accountId.
    // This causes E11000 when multiple users have the same Meta ad accountId.
    const oldUniqueAccountIdIndexes = indexes.filter(
      (index) =>
        index.unique === true &&
        index.key &&
        Object.keys(index.key).length === 1 &&
        index.key.accountId === 1,
    );

    const compositeIndexExists = indexes.some(
      (index) =>
        index.unique === true &&
        index.key &&
        index.key.userId === 1 &&
        index.key.accountId === 1,
    );

    for (const oldIndex of oldUniqueAccountIdIndexes) {
      try {
        console.log(
          `Dropping old facebook-ad-accounts index: ${oldIndex.name}`,
        );
        await collection.dropIndex(oldIndex.name as unknown as any);
      } catch (error) {
        console.error(
          `Failed to drop facebook-ad-accounts index ${oldIndex.name}:`,
          error,
        );
      }
    }

    if (!compositeIndexExists) {
      try {
        console.log('Creating facebook-ad-accounts composite index...');
        await collection.createIndex(
          { userId: 1, accountId: 1 },
          { unique: true, name: 'userId_1_accountId_1' },
        );
        console.log('Created facebook-ad-accounts composite index');
      } catch (error) {
        console.error(
          'Failed to create facebook-ad-accounts composite index:',
          error,
        );
      }
    } else {
      console.log('Facebook-ad-accounts composite index already exists');
    }
  }

  private async ensureInstagramAccountIndexes() {
    const collection = this.instagramAccountModel.collection;

    const indexes = await collection.indexes();
    console.log(
      'Current instagram-accounts indexes:',
      JSON.stringify(indexes, null, 2),
    );

    // Drop any old *unique* index that only keys on instagramAccountId.
    // Instagram account ids are not globally unique in our model; we scope by user.
    const oldUniqueInstagramAccountIdIndexes = indexes.filter(
      (index) =>
        index.unique === true &&
        index.key &&
        Object.keys(index.key).length === 1 &&
        index.key.instagramAccountId === 1,
    );

    const compositeIndexExists = indexes.some(
      (index) =>
        index.unique === true &&
        index.key &&
        index.key.userId === 1 &&
        index.key.instagramAccountId === 1,
    );

    for (const oldIndex of oldUniqueInstagramAccountIdIndexes) {
      try {
        console.log(`Dropping old instagram-accounts index: ${oldIndex.name}`);
        await collection.dropIndex(oldIndex.name as unknown as any);
      } catch (error) {
        console.error(
          `Failed to drop instagram-accounts index ${oldIndex.name}:`,
          error,
        );
      }
    }

    if (!compositeIndexExists) {
      try {
        console.log('Creating instagram-accounts composite index...');
        await collection.createIndex(
          { userId: 1, instagramAccountId: 1 },
          { unique: true, name: 'userId_1_instagramAccountId_1' },
        );
        console.log('Created instagram-accounts composite index');
      } catch (error) {
        console.error(
          'Failed to create instagram-accounts composite index:',
          error,
        );
      }
    } else {
      console.log('Instagram-accounts composite index already exists');
    }
  }
}
