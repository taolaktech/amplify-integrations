import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDoc = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true })
  email: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  name: string;

  @Prop()
  photoUrl: string;

  @Prop({ unique: true })
  firebaseUserId: string;

  @Prop()
  otp: string;

  @Prop({ type: Date })
  otpExpiryDate: Date;

  @Prop()
  signUpMethod: string;

  @Prop()
  passwordChangedAt?: Date;

  @Prop({ default: false })
  shopifyAccountConnected: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
