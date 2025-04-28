import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { ShopifyAccountStatus } from 'src/enums/shopify-account-status';

export type ShopifyAccountDoc = HydratedDocument<ShopifyAccount>;

@Schema({ timestamps: true })
export class ShopifyAccount {
  @Prop({ unique: true })
  shop: string;

  @Prop()
  accessToken: string;

  @Prop()
  scope: string;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'users' })
  belongsTo: mongoose.Types.ObjectId;

  @Prop()
  accountStatus: ShopifyAccountStatus;

  @Prop()
  disconnectedAt: Date;
}

export const ShopifySchema = SchemaFactory.createForClass(ShopifyAccount);
