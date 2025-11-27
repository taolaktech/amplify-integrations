// src/database/database-index.service.ts
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FacebookCampaign } from './schema';

@Injectable()
export class DatabaseIndexService implements OnApplicationBootstrap {
  constructor(
    @InjectModel('facebook-campaigns')
    private readonly facebookCampaignModel: Model<FacebookCampaign>,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.ensureCorrectIndexes();
    } catch (error) {
      console.error('Failed to ensure correct indexes:', error);
    }
  }

  private async ensureCorrectIndexes() {
    const collection = this.facebookCampaignModel.collection;

    // Get all current indexes
    const indexes = await collection.indexes();

    // Log all indexes for debugging
    console.log('Current indexes:', JSON.stringify(indexes, null, 2));

    // Check for any index that has only campaignId and is unique (regardless of name)
    const oldIndexes = indexes.filter(
      (index) =>
        index.unique === true &&
        index.key &&
        Object.keys(index.key).length === 1 &&
        index.key.campaignId === 1,
    );

    // Check if the new composite index exists
    const newIndexExists = indexes.some(
      (index) =>
        index.unique === true &&
        index.key &&
        index.key.campaignId === 1 &&
        index.key.platform === 1,
    );

    // Drop any old indexes that we found
    for (const oldIndex of oldIndexes) {
      try {
        console.log(`Dropping old index: ${oldIndex.name}`);
        await collection.dropIndex(oldIndex.name as unknown as any);
      } catch (error) {
        console.error(`Failed to drop index ${oldIndex.name}:`, error);
      }
    }

    // Create the new composite index if it doesn't exist
    if (!newIndexExists) {
      try {
        console.log('Creating composite index...');
        await collection.createIndex(
          { campaignId: 1, platform: 1 },
          { unique: true, name: 'campaignId_1_platform_1' },
        );
        console.log('Created composite index');
      } catch (error) {
        console.error('Failed to create composite index:', error);
      }
    } else {
      console.log('Composite index already exists');
    }
  }
}
