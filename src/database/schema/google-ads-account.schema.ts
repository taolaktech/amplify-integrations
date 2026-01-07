import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GoogleAdsAccountDoc = HydratedDocument<GoogleAdsAccount>;

@Schema({ timestamps: true })
export class GoogleAdsAccount {
  @Prop({ type: Types.ObjectId, ref: 'users', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  googleUserId: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  refreshToken: string;

  @Prop()
  refreshTokenExpiresAt?: Date;

  @Prop()
  accessToken?: string;

  @Prop()
  accessTokenExpiresAt?: Date;

  @Prop()
  primaryCustomerAccount?: string;

  @Prop({ enum: ['CONNECTED', 'DISCONNECTED'], default: 'CONNECTED' })
  primaryAdAccountState: 'CONNECTED' | 'DISCONNECTED';

  @Prop({ type: [String], default: [] })
  accessibleCustomers: string[];

  @Prop()
  lastAccessibleCustomersFetchAt?: Date;

  @Prop()
  conversionActionResourceName?: string;

  @Prop()
  conversionActionId?: string;

  @Prop()
  conversionActionTag?: string;

  @Prop()
  conversionActionLabel?: string;

  @Prop({ type: [Object], default: [] })
  conversionActionTagSnippets?: any[];
}

export const GoogleAdsAccountSchema =
  SchemaFactory.createForClass(GoogleAdsAccount);

GoogleAdsAccountSchema.index({ userId: 1, googleUserId: 1 }, { unique: true });
