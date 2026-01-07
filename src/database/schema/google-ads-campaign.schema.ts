import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Document, Types } from 'mongoose';
import { GoogleAdsProcessingStatus } from 'src/enums';

export type GoogleAdsCampaignDoc = HydratedDocument<GoogleAdsCampaign>;

@Schema({ _id: false })
class AdGroupAd {
  @Prop()
  resourceName: string;

  @Prop()
  name: string;

  @Prop()
  status: string;
}

const AdGroupAdSchema = SchemaFactory.createForClass(AdGroupAd);

@Schema({ _id: false })
class AdGroup {
  @Prop()
  resourceName: string;

  @Prop()
  name: string;

  @Prop()
  productId: string;

  @Prop()
  type: string;

  @Prop()
  status: string;

  @Prop({ type: [AdGroupAdSchema], default: [] })
  ads: AdGroupAd[];
}

const AdGroupSchema = SchemaFactory.createForClass(AdGroup);

@Schema({ _id: false })
class Metrics {
  @Prop({ default: '0' })
  clicks: string;

  @Prop({ default: 0 })
  conversionsValue: number;

  @Prop({ default: 0 })
  conversions: number;

  @Prop({ default: '0' })
  costMicros: string;

  @Prop({ default: '0' })
  impressions: string;
}

const MetricsSchema = SchemaFactory.createForClass(Metrics);

@Schema({ timestamps: true })
export class GoogleAdsCampaign extends Document {
  @Prop({ type: Types.ObjectId, ref: 'campaigns', required: true })
  campaign: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'google-ads-accounts' })
  connectionId?: Types.ObjectId;

  @Prop()
  googleAdsCustomerId?: string;

  @Prop()
  campaignResourceName: string;

  @Prop()
  campaignName: string;

  @Prop()
  campaignType: string;

  @Prop()
  campaignStatus: string;

  @Prop()
  budgetResourceName: string;

  @Prop()
  budgetAmountMicros: number;

  @Prop()
  biddingStrategyResourceName: string;

  @Prop()
  biddingStrategyType: string;

  @Prop({ type: [AdGroupSchema], default: [] })
  adGroups: AdGroup[];

  @Prop({ default: false })
  keywordsAddedToAdGroups: boolean;

  @Prop({ default: false })
  geotargetingAddedToCampaign: boolean;

  @Prop({
    enum: Object.keys(GoogleAdsProcessingStatus),
    default: GoogleAdsProcessingStatus.PENDING,
  })
  processingStatus: GoogleAdsProcessingStatus;

  @Prop({
    enum: Object.keys(GoogleAdsProcessingStatus),
  })
  processingStatusBeforeFailure?: GoogleAdsProcessingStatus;

  @Prop({ type: MetricsSchema, default: () => {} })
  metrics?: Metrics;

  @Prop()
  metricsLastUpdatedAt: Date;
}

export const GoogleAdsCampaignSchema =
  SchemaFactory.createForClass(GoogleAdsCampaign);
