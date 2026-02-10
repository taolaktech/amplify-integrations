import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MediaGenerationJobDoc = HydratedDocument<MediaGenerationJob>;

@Schema({ timestamps: true })
export class MediaGenerationJob {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  assetId: Types.ObjectId;

  @Prop({ index: true, required: true, enum: ['image', 'video'] })
  type: 'image' | 'video';

  @Prop({ required: true, index: true, enum: ['openai', 'nanobanana'] })
  provider: 'openai' | 'nanobanana';

  @Prop({ required: true, unique: true, index: true })
  providerJobId: string;

  @Prop({ required: true })
  prompt: string;

  @Prop({ default: 'sora-2' })
  model: 'sora-2' | 'nanobanana';

  @Prop({
    enum: ['queued', 'running', 'completed', 'failed'],
    default: 'queued',
  })
  status: 'queued' | 'running' | 'completed' | 'failed';

  @Prop({ default: 0 })
  progress: number;

  @Prop()
  seconds?: string;

  @Prop()
  size?: string;

  @Prop()
  quality?: string;

  @Prop()
  completedAt?: Date;

  @Prop()
  mediaUrl?: string;

  @Prop()
  mediaKey?: string;

  @Prop()
  notifiedAt?: Date;

  @Prop({ type: Object })
  error?: { code?: string; message?: string };
}

export const MediaGenerationJobSchema =
  SchemaFactory.createForClass(MediaGenerationJob);
