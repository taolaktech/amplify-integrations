import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

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
class Colors {
  @Prop()
  primary: string[];

  @Prop()
  secondary: string[];
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
  logo: string;

  @Prop()
  coverImage: string;

  @Prop()
  colors: Colors;

  @Prop()
  industry: string;

  @Prop()
  companyRole: string;

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

  @Prop()
  shippingLocations: ShippingLocations;

  @Prop({ ref: 'shopify-accounts', type: [Types.ObjectId], default: [] })
  shopifyAccounts: Types.ObjectId[];
}

export const BusinessSchema = SchemaFactory.createForClass(Business);
