// instagram-account.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type InstagramAccountDocument = HydratedDocument<InstagramAccount>;

@Schema({ timestamps: true })
export class InstagramAccount {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true })
  instagramAccountId: string;

  @Prop({ required: true })
  username: string;

  @Prop()
  accountType?: string; // BUSINESS, CREATOR, etc.

  @Prop()
  followersCount?: number;

  @Prop({ required: true })
  pageId: string; // Reference to the connected Facebook Page

  @Prop({ default: false })
  isPrimary: boolean; // User's selected primary Instagram account

  @Prop()
  accessToken?: string; // If needed for direct API calls

  // field to store the associated Facebook Ad Account
  @Prop()
  associatedAdAccountId?: string;
}

export const InstagramAccountSchema =
  SchemaFactory.createForClass(InstagramAccount);
