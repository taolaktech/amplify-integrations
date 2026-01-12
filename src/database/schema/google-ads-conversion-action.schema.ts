import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type GoogleAdsConversionActionDoc =
  HydratedDocument<GoogleAdsConversionAction>;

@Schema({ timestamps: true })
export class GoogleAdsConversionAction {
  @Prop({ type: Types.ObjectId, ref: 'users', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  googleCustomerId: string;

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

export const GoogleAdsConversionActionSchema = SchemaFactory.createForClass(
  GoogleAdsConversionAction,
);

GoogleAdsConversionActionSchema.index(
  { userId: 1, googleCustomerId: 1 },
  { unique: true },
);
