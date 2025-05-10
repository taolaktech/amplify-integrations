import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BusinessDetailsDoc = HydratedDocument<BusinessDetails>;

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
  city: string;

  @Prop()
  state: string;
}

@Schema({ _id: false })
class ShippingLocations {
  @Prop()
  localShippingLocations: LocalShippingLocations[];

  @Prop()
  internationalShippingLocations: string[];
}

@Schema({ timestamps: true })
export class BusinessDetails {
  @Prop({ type: Types.ObjectId, ref: 'users' })
  userId: Types.ObjectId;

  @Prop()
  companyName: string;

  @Prop()
  description: string;

  @Prop()
  website: string;

  @Prop()
  industry: string;

  @Prop()
  companyRole: string;

  @Prop()
  teamSize: Range;

  @Prop()
  estimatedMonthlyBudget: Price;

  @Prop()
  estimatedAnnualRevenue: Price;

  @Prop()
  businessGoals: BusinessGoal;

  @Prop()
  shippingLocations: ShippingLocations;
}

export const BusinessDetailsSchema =
  SchemaFactory.createForClass(BusinessDetails);
