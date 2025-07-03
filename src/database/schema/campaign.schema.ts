// src/campaigns/schemas/campaign.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CampaignDocument = HydratedDocument<Campaign>;

@Schema({ timestamps: true })
export class Campaign {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: [String] })
  platforms: string[]; // e.g., ['facebook', 'google']

  @Prop()
  targetAudience: string;

  @Prop()
  budget: number;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop()
  adLocation: string;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
