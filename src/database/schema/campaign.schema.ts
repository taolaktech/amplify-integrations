// src/campaigns/schemas/campaign.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';
import { CampaignStatus, CampaignPlatform } from '../../enums/campaign';
import { GoogleAdsCampaign } from './google-ads-campaign.schema';

export type CampaignDocument = HydratedDocument<Campaign>;

@Schema({ _id: false, timestamps: false })
class Creative {
  @ApiProperty({
    example: '1234567890',
    description: 'Unique identifier for the creative.',
  })
  @Prop()
  id?: string;

  @ApiProperty({ example: 'facebook', description: 'The advertising channel.' })
  @Prop({ required: true })
  channel: 'facebook' | 'instagram' | 'google';

  @ApiProperty({
    example: 'pending',
    description: 'Status for set gen for facebook and instagram',
  })
  @Prop({ required: false })
  status?: 'pending' | 'created';

  @ApiProperty({
    example: ['https://example.com/image.jpg'],
    description: 'Array of creative assets (URLs, text).',
  })
  @Prop({ type: [String], required: true, default: [] })
  data: string[];
}

const CreativeSchema = SchemaFactory.createForClass(Creative);

@Schema({ _id: false }) // Using _id: false as it's a simple value object
export class Location {
  // @Prop({ required: true })
  // name: string;

  @ApiProperty({ example: 'United States', description: 'The country.' })
  @Prop({ required: true })
  country: string;

  @ApiProperty({ example: 'Manhattan', description: 'Target city.' })
  @Prop({ required: true })
  city: string;

  @ApiProperty({ example: 'New York', description: 'Target state.' })
  @Prop({ required: true })
  state: string;
}
export const LocationSchema = SchemaFactory.createForClass(Location);

@Schema({ _id: false, timestamps: false })
export class Product {
  @ApiProperty({
    example: '1234567890',
    description: 'Shopify product ID.',
  })
  @Prop({ required: true })
  shopifyId: string;

  @ApiProperty({
    example: 'AeroStride Pro Shoes',
    description: 'Product title.',
  })
  @Prop({ required: true })
  title: string;

  @ApiProperty({ example: 159.99, description: 'Product price.' })
  @Prop({ required: true })
  price: number;

  @ApiProperty({
    example: 'Next-gen running shoes.',
    description: 'Product description.',
  })
  @Prop({ required: true })
  description: string;

  @ApiProperty({
    example: 'Serious runners',
    description: 'Target audience for the product.',
  })
  @Prop()
  audience?: string;

  @ApiProperty({ example: 'Race day', description: 'Suitable occasion.' })
  @Prop()
  occasion: string;

  @ApiProperty({
    example: ['Carbon fiber plate'],
    description: 'List of product features.',
  })
  @Prop({ type: [String], default: [] })
  features: string[];

  @ApiProperty({ example: 'Footwear', description: 'Product category.' })
  @Prop({ required: true })
  category: string;

  @ApiProperty({
    example: ['https://example.com/image.png'],
    description: 'URLs to product image.',
  })
  @Prop({ required: true })
  imageLinks: string[];

  @ApiProperty({
    example: 'https://example.com/product/123',
    description: 'URL to product page.',
  })
  @Prop({ required: true })
  productLink: string;

  @ApiProperty({
    type: [Creative],
    description: 'List of creatives for this product.',
  })
  @Prop({ type: [CreativeSchema], required: true })
  creatives: Creative[];
}
export const ProductSchema = SchemaFactory.createForClass(Product);

@Schema({ _id: false })
class Metrics {
  @ApiProperty({
    example: 25,
  })
  @Prop({ default: 0 })
  totalClicks: number;

  @ApiProperty({
    example: 25,
  })
  @Prop({ default: 0 })
  totalConversionsValue: number;

  @ApiProperty({
    example: 25,
  })
  @Prop({ default: 0 })
  totalConversions: number;

  @ApiProperty({
    example: 25,
  })
  @Prop({ default: 0 })
  totalCost: number;

  @ApiProperty({
    example: 25,
  })
  @Prop({ default: 0 })
  totalImpressions: number;
}
export const MetricsSchema = SchemaFactory.createForClass(Metrics);

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Campaign {
  @Prop({ type: Types.ObjectId, ref: 'users', required: true })
  createdBy: Types.ObjectId;

  @ApiProperty({
    enum: CampaignStatus,
    description: 'The current status of the campaign.',
  })
  @Prop({
    type: String,
    enum: CampaignStatus,
    default: CampaignStatus.READY_TO_LAUNCH,
  })
  status: CampaignStatus;

  @ApiProperty({
    example: '65e5d6a8c4b1a8d4b3c9d7b2',
    description: 'The ID of the associated business.',
  })
  @Prop({ type: Types.ObjectId, ref: 'business', required: true })
  businessId: Types.ObjectId;

  @ApiProperty({
    example: '65e5d6a8c4b1a8d4b3c9d7b2',
    description: 'The database ID of the shopify account.',
  })
  @Prop({ type: Types.ObjectId, ref: 'shopify-accounts' })
  shopifyAccountId: Types.ObjectId;

  @ApiProperty({
    example: 'June Spring Campaign',
    description: 'The name of the campaign.',
  })
  @Prop()
  name: string;

  @ApiProperty({
    example: 'PRODUCT LAUNCH',
    description: 'The type of campaign.',
  })
  @Prop({ type: String, required: true })
  type: string;

  @ApiProperty({ example: '#3b5998', description: 'Primary campaign color.' })
  @Prop()
  brandColor: string;

  @ApiProperty({ example: '#3b5998', description: 'Primary campaign color.' })
  @Prop()
  accentColor: string;

  @ApiProperty({
    example: 'Playful and energetic',
    description: 'Tone of voice for ad copy.',
  })
  @Prop()
  tone: string;

  @ApiProperty({
    example: '2024-08-01T00:00:00Z',
    description: 'Campaign start date.',
  })
  @Prop({ required: true })
  startDate: Date;

  @ApiProperty({
    example: '2024-08-31T23:59:59Z',
    description: 'Campaign end date.',
  })
  @Prop({ required: true })
  endDate: Date;

  @ApiProperty({ example: 15000, description: 'Total campaign budget.' })
  @Prop({ required: true })
  totalBudget: number;

  @ApiProperty({
    type: [Product],
    description: 'List of products in the campaign.',
  })
  @Prop({ type: [ProductSchema], required: true })
  products: Product[];

  @ApiProperty({
    type: [Location],
    description: 'List of targeted locations.',
  })
  @Prop({ type: [LocationSchema], required: true })
  location: Location[];

  @ApiProperty({
    enum: CampaignPlatform,
    isArray: true,
    example: Object.values(CampaignPlatform),
    description: 'List of targeted platforms.',
  })
  @Prop({
    type: [String], // Stored as an array of strings
    enum: Object.values(CampaignPlatform), // Validates against the enum values
    required: true,
  })
  platforms: CampaignPlatform[];

  @ApiProperty({
    type: [Metrics],
    description: 'Total metrics- aggregated across all platforms.',
  })
  @Prop({ type: MetricsSchema, default: () => {} })
  metrics: Metrics;

  @ApiProperty({
    type: Date,
    description: 'The last date when metrics were updated.',
  })
  @Prop({ type: Date })
  metricsLastUpdatedAt: Date;

  @ApiProperty({
    type: Date,
    description: 'Date when the campaign was archived',
  })
  archivedAt?: Date;

  /**
   * Populated virtual for the associated Google Ads campaign.
   * This is set when using .populate('googleAdsCampaign').
   */
  googleAdsCampaign?: HydratedDocument<GoogleAdsCampaign>;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);

CampaignSchema.virtual('googleAdsCampaign', {
  ref: 'google-ads-campaigns',
  localField: '_id',
  foreignField: 'campaign',
  justOne: true,
});

CampaignSchema.virtual('campaignProducts', {
  ref: 'campaign-products',
  localField: '_id',
  foreignField: 'campaignId',
  justOne: false,
});
