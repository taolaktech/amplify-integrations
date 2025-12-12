import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FacebookCampaignDocument = HydratedDocument<FacebookCampaign>;

// Track individual Facebook AdSets created for this campaign
@Schema({ _id: false })
export class FacebookAdSet {
  @Prop({ required: true })
  adSetId: string; // Facebook AdSet ID

  @Prop({ required: true })
  name: string; // AdSet name (e.g., "Product 1 - Running Shoes")

  @Prop({ required: true })
  dailyBudget: number; // Daily budget in cents (Facebook requirement)

  @Prop({ required: true })
  currency: string; // Currency code (USD, EUR, etc.)

  @Prop({
    enum: ['ACTIVE', 'PAUSED', 'DELETED', 'PENDING_REVIEW', 'DISAPPROVED'],
    default: 'PENDING_REVIEW',
  })
  status: string; // Facebook AdSet status

  @Prop({ type: [String] })
  productIds: string[]; // Which products from campaign are in this AdSet

  @Prop({ type: Object })
  targetingConfig?: Record<string, any>; // Store Facebook targeting configuration

  @Prop({ default: Date.now })
  createdAt: Date;
}

// Track individual Facebook Ads created for this campaign
@Schema({ _id: false })
export class FacebookAd {
  @Prop({ required: true })
  adId: string; // Facebook Ad ID

  @Prop({ required: true })
  adSetId: string; // Which AdSet this ad belongs to

  @Prop({ required: true })
  creativeId: string; // Facebook Creative ID

  @Prop({ required: true })
  name: string; // Ad name

  @Prop({
    enum: ['ACTIVE', 'PAUSED', 'DELETED', 'PENDING_REVIEW', 'DISAPPROVED'],
    default: 'PENDING_REVIEW',
  })
  status: string; // Facebook Ad status

  @Prop()
  productId?: string; // Which product this ad promotes

  @Prop({ default: Date.now })
  createdAt: Date;
}

// Track Facebook Creative assets
@Schema({ _id: false })
export class FacebookCreativeAsset {
  @Prop() // This ID will be populated during the ad creation step
  creativeId?: string;

  @Prop({ required: true })
  name: string; // e.g., "Product-Level Creative - Nike Shoes"

  @Prop({ required: true, type: Object })
  assetFeedSpec: Record<string, any>; // The prepared asset feed spec for this creative

  @Prop()
  productId?: string; // Associates this creative with a product

  @Prop({
    enum: ['PENDING', 'CREATED', 'FAILED'],
    default: 'PENDING',
  })
  status: string; // Internal status for tracking

  @Prop({ default: Date.now })
  createdAt: Date;
}
// @Schema({ _id: false })
// export class FacebookCreativeAsset {
//   @Prop({ required: true })
//   creativeId: string; // Facebook Creative ID

//   @Prop({ required: true })
//   name: string; // Creative name

//   @Prop({ required: true })
//   imageUrl: string; // The S3 image URL from campaign data

//   @Prop()
//   primaryText?: string; // Ad copy text

//   @Prop()
//   headline?: string; // Ad headline

//   @Prop()
//   description?: string; // Ad description

//   @Prop()
//   callToAction?: string; // CTA button text

//   @Prop()
//   destinationUrl?: string; // Where ad clicks go

//   @Prop()
//   productId?: string; // Which product this ad promotes

//   @Prop({
//     enum: ['PENDING', 'APPROVED', 'REJECTED'],
//     default: 'PENDING',
//   })
//   approvalStatus: string; // Facebook creative approval status

//   @Prop({ default: Date.now })
//   createdAt: Date;
// }

/**
 * Define PerformanceData as a separate sub-schema.
 * This resolves the type inference error and provides a clear structure.
 */
@Schema({ _id: false }) // It's an embedded document, doesn't need its own _id
export class PerformanceData {
  @Prop({ default: 0 })
  impressions: number;

  @Prop({ default: 0 })
  clicks: number;

  @Prop({ default: 0 })
  spend: number;

  @Prop({ default: 0 })
  conversions: number;

  @Prop({ default: 0 })
  ctr: number;

  @Prop({ default: 0 })
  cpc: number;

  @Prop({ default: 0 })
  roas: number; // Return on Ad Spend

  @Prop({ default: Date.now })
  lastUpdated: Date;
}

export const PerformanceDataSchema =
  SchemaFactory.createForClass(PerformanceData);

// Main Facebook Campaign tracking document
@Schema({ timestamps: true })
export class FacebookCampaign {
  @Prop({
    type: Types.ObjectId,
    ref: 'campaigns',
    required: true,
  })
  campaignId: string; //Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'users', required: true })
  userId: string; //Types.ObjectId;

  @Prop({ required: true })
  userAdAccountId: string;

  /**
   * Store the original campaign data from the Lambda.
   * This ensures this service is stateless and can resume campaign creation at any step
   * by re-reading the original requirements from this field.
   */
  @Prop({ type: Object, required: true })
  originalCampaignData: Record<string, any>;

  @Prop()
  facebookCampaignId?: string;

  @Prop()
  facebookCampaignName?: string;

  @Prop({
    enum: [
      'CREATING',
      'ACTIVE',
      'PAUSED',
      'DELETED',
      'PENDING_REVIEW',
      'DISAPPROVED',
      'COMPLETED',
      'ARCHIVED',
    ],
    default: 'CREATING',
  })
  facebookStatus: string;

  @Prop({ required: true })
  allocatedBudget: number;

  @Prop({ required: true })
  dailyBudget: number;

  @Prop({ required: true, default: 'USD' })
  currency: string;

  @Prop({ type: [FacebookAdSet], default: [] })
  adSets: FacebookAdSet[];

  @Prop({ type: [FacebookAd], default: [] })
  ads: FacebookAd[];

  @Prop({ type: [FacebookCreativeAsset], default: [] })
  creatives: FacebookCreativeAsset[];

  @Prop({
    enum: [
      'PENDING',
      'INITIALIZING',
      'INITIALIZED',
      'CREATING_ADSETS',
      'ADSETS_CREATED',
      'CREATING_CREATIVES',
      'CREATIVES_CREATED',
      'CREATING_ADS',
      'ADS_CREATED',
      'LAUNCHING',
      'LAUNCHED',
      'ACTIVE',
      'FAILED',
      'PAUSED',
    ],
    default: 'PENDING',
    required: true,
  })
  processingStatus: string;

  @Prop({
    enum: ['FACEBOOK', 'INSTAGRAM'],
    default: 'FACEBOOK',
    required: true,
  })
  platform: string;

  @Prop()
  failedStep?: string;

  @Prop()
  errorMessage?: string;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop()
  lastProcessedAt?: Date;

  @Prop({ type: PerformanceDataSchema })
  performanceData?: PerformanceData;

  @Prop({
    type: String,
    required: String,
  })
  metaPixelId: string;

  @Prop({ required: false })
  instagramActorId?: string;
}

export const FacebookCampaignSchema =
  SchemaFactory.createForClass(FacebookCampaign);

// Create indexes for efficient queries
FacebookCampaignSchema.index({ campaignId: 1, platform: 1 }, { unique: true }); // Find by campaign ID and platform
FacebookCampaignSchema.index({ userId: 1 }); // Find user's Facebook campaigns
FacebookCampaignSchema.index({ facebookStatus: 1 }); // Find campaigns by status
