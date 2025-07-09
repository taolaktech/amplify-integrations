import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FacebookPageDocument = FacebookPage & Document;

@Schema({ timestamps: true })
export class FacebookPage {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true })
  pageId: string;

  @Prop({ required: true })
  pageName: string;

  @Prop({ required: false })
  pageCategory?: string;

  @Prop({ required: true })
  accessToken: string;

  @Prop({ default: false })
  isPrimaryPage: boolean; // In case user connects multiple pages
}

export const FacebookPageSchema = SchemaFactory.createForClass(FacebookPage);
