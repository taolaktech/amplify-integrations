import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VideoGenerationJobDoc = HydratedDocument<VideoGenerationJob>;

@Schema({ timestamps: true })
export class VideoGenerationJob {
  @Prop({ required: true, index: true })
  creativeSetId: string;

  @Prop({ required: true, index: true })
  campaignId: string;

  @Prop({ required: true, index: true, enum: ['openai'] })
  provider: 'openai';

  @Prop({ required: true, unique: true, index: true })
  providerJobId: string;

  @Prop({ required: true })
  prompt: string;

  @Prop({ default: 'sora-2' })
  model: string;

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
  videoUrl?: string;

  @Prop()
  videoKey?: string;

  @Prop()
  notifiedAt?: Date;

  @Prop({ type: Object })
  error?: { code?: string; message?: string };
}

export const VideoGenerationJobSchema =
  SchemaFactory.createForClass(VideoGenerationJob);
