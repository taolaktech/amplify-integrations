import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { ShopifyAccountStatus } from 'src/shopify/enums/shopify-account-status';

export type ShopifyAccountDoc = HydratedDocument<ShopifyAccount>;

@Schema({ timestamps: true })
export class ShopifyAccount {
  @Prop()
  shopId: string;

  @Prop()
  shop: string;

  @Prop()
  accessToken: string;

  @Prop()
  scope: string;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'users' })
  belongsTo: mongoose.Types.ObjectId | string;

  @Prop()
  currencyCode: string;

  @Prop()
  accountStatus: ShopifyAccountStatus;

  @Prop()
  disconnectedAt: Date;
}

export const ShopifyAccountSchema =
  SchemaFactory.createForClass(ShopifyAccount);
