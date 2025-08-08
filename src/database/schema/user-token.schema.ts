import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserTokenDocument = HydratedDocument<UserToken>;

@Schema({ timestamps: true })
export class UserToken {
  @Prop({ type: Types.ObjectId, ref: 'users', required: true })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['facebook', 'google', 'instagram'],
  })
  provider: string;

  @Prop({
    required: true,
    enum: ['access', 'refresh', 'page'],
  })
  tokenType: string;

  @Prop({ required: true })
  encryptedToken: string;

  @Prop()
  expiresAt?: Date;

  @Prop()
  scope?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const UserTokenSchema = SchemaFactory.createForClass(UserToken);

// Create compound index for efficient lookups
UserTokenSchema.index({ userId: 1, provider: 1, tokenType: 1 });
