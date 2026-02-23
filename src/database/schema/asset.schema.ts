import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssetDoc = Asset & Document;

export type AssetType = 'image' | 'video';
export type AssetSource = 'generated' | 'uploaded';

@Schema({ timestamps: true })
export class Asset {
  @Prop({ type: Types.ObjectId, ref: 'business', required: true, index: true })
  businessId: Types.ObjectId;

  @Prop({ required: false, index: true })
  productId: string;

  @Prop()
  productImageUrl: string;

  @Prop()
  otherProductImageUrls: string[];

  @Prop({ required: true, enum: ['image', 'video'], index: true })
  type: AssetType;

  @Prop({ default: 'pending', required: true })
  status: 'pending' | 'completed' | 'failed';

  @Prop({ required: true, enum: ['ai-generated', 'uploaded'], index: true })
  source: AssetSource;

  @Prop()
  mediaUrl?: string;

  @Prop()
  storageKey?: string;

  @Prop()
  thumbnailUrl?: string;

  @Prop()
  thumbnailKey?: string;

  @Prop()
  duration?: number;

  @Prop({ type: String })
  resolution?: string;

  @Prop()
  size?: number;

  @Prop()
  promptUsed?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  generationJobId?: string;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
