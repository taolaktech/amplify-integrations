import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { Industry } from 'src/enums/industry';

export type BusinessDoc = HydratedDocument<Business>;

@Schema({ _id: false })
class Range {
  @Prop()
  min: number;

  @Prop()
  max: number;
}

@Schema({ _id: false })
class BusinessGoal {
  @Prop({ default: false })
  brandAwareness: boolean;

  @Prop({ default: false })
  acquireNewCustomers: boolean;

  @Prop({ default: false })
  boostRepeatPurchases: boolean;
}

@Schema({ _id: false })
class Price {
  @Prop()
  amount: number;

  @Prop()
  currency: string;
}

@Schema({ _id: false })
class LocalShippingLocations {
  @Prop()
  country: string;

  @Prop()
  state: string;

  @Prop()
  city: string;

  @Prop()
  shorthand: string;
}

@Schema({ _id: false })
class ShippingLocations {
  @Prop()
  localShippingLocations: LocalShippingLocations[];

  @Prop()
  internationalShippingLocations: string[];
}

@Schema({ _id: false })
class ShopifyIntegration {
  @Prop({ type: Types.ObjectId, ref: 'shopify-accounts' })
  shopifyAccount: Types.ObjectId;
}

@Schema({ _id: false })
class GoogleAdsIntegration {
  @Prop({ type: Types.ObjectId, ref: 'google-ads-accounts' })
  primaryAdAccountConnection: Types.ObjectId;
}

@Schema({ _id: false })
class FacebookIntegration {
  @Prop()
  adAccountId: string;

  @Prop()
  pageId: string;
}

@Schema({ _id: false })
class InstagramIntegration {
  @Prop()
  adAccountId: string;

  @Prop()
  instagramAccountId: string;
}

@Schema({ _id: false })
class Integrations {
  @Prop()
  shopify: ShopifyIntegration;

  @Prop()
  googleAds: GoogleAdsIntegration;

  @Prop()
  facebook: FacebookIntegration;

  @Prop()
  instagram: InstagramIntegration;
}

@Schema({ timestamps: true })
export class Business {
  @Prop({ type: Types.ObjectId, ref: 'users' })
  userId: Types.ObjectId;

  @Prop()
  companyName: string;

  @Prop()
  description: string;

  @Prop()
  website: string;

  @Prop()
  logo?: string;

  @Prop()
  logoKey?: string;

  @Prop()
  industry: Industry;

  @Prop()
  companyRole: string;

  @Prop()
  contactEmail: string;

  @Prop()
  contactPhone: string;

  @Prop()
  teamSize: Range;

  @Prop()
  currencyCode: string;

  @Prop()
  estimatedMonthlyBudget: Price;

  @Prop()
  estimatedAnnualRevenue: Price;

  @Prop()
  businessGoals: BusinessGoal;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  shopifyBrandAssets: { [k: string]: any };

  @Prop({ ref: 'brand-assets', type: [Types.ObjectId] })
  brandAssets: Types.ObjectId[];

  @Prop()
  shippingLocations: ShippingLocations;

  @Prop({ ref: 'shopify-accounts', type: [Types.ObjectId], default: [] })
  shopifyAccounts: Types.ObjectId[];

  @Prop()
  integrations: Integrations;
}

export const BusinessSchema = SchemaFactory.createForClass(Business);
