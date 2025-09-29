import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type FacebookAdAccountDocument = HydratedDocument<FacebookAdAccount>;

@Schema({ _id: false })
export class SystemUserPermission {
  @Prop({ required: true })
  systemUserId: string;

  //  Facebook doesn't return status - so we have to track assignment state internally
  @Prop({
    enum: [
      'NOT_REQUESTED',
      'ASSIGNMENT_PENDING',
      'ASSIGNED',
      'ASSIGNMENT_FAILED',
    ],
    default: 'NOT_REQUESTED',
  })
  assignmentStatus: string;

  @Prop({ default: Date.now })
  lastAssignmentAttempt: Date;

  @Prop()
  assignedAt?: Date; // time we confirmed assignment via API

  @Prop([String])
  grantedTasks: string[]; //  facebook actually granted: ['MANAGE', 'ADVERTISE', 'ANALYZE']

  @Prop([String])
  requestedTasks: string[]; // tasks we requested: ['MANAGE', 'ADVERTISE', 'ANALYZE']

  @Prop()
  lastStatusCheck?: Date;

  @Prop()
  assignmentError?: string; // If assignment failed
}

export const SystemUserPermissionSchema =
  SchemaFactory.createForClass(SystemUserPermission);

@Schema({ timestamps: true })
export class FacebookAdAccount {
  @Prop({ type: mongoose.Types.ObjectId, ref: 'users' })
  userId: string;

  @Prop({ required: true, unique: true })
  accountId: string; // "

  @Prop()
  name?: string;

  @Prop()
  currency?: string;

  @Prop()
  accountStatus?: number;

  @Prop()
  businessName?: string;

  @Prop()
  role?: string; // user’s role on this account

  @Prop({ default: false })
  isPrimary: boolean; // User's selected primary account

  @Prop()
  encryptedAccessToken?: string; // For reading insights

  @Prop({
    enum: ['READ_ONLY', 'FULL_ACCESS'],
    default: 'READ_ONLY',
  })
  accessLevel: string;

  // system user permission tracking
  @Prop({ type: SystemUserPermissionSchema })
  systemUserPermission?: SystemUserPermission;

  // integration status based on actual API behavior
  @Prop({
    enum: [
      'SETUP_INCOMPLETE', // No system user assigned yet
      'SYSTEM_USER_ASSIGNED', // System user successfully assigned
      'ASSIGNMENT_FAILED', // System user assignment failed
      'READY_FOR_CAMPAIGNS', // Fully ready to create campaigns
    ],
    default: 'SETUP_INCOMPLETE',
  })
  integrationStatus: string;

  @Prop({ default: Date.now })
  fetchedAt: Date;

  @Prop({
    type: String,
  })
  metaPixelId: string;

  /**
   * Link to the selected Facebook Page to be used for advertising.
   * This page must be owned by or have permissions granted by the user.
   */
  @Prop({ type: mongoose.Types.ObjectId, ref: 'facebook-pages' })
  selectedPrimaryFacebookPageId?: string;
}

export const FacebookAdAccountSchema =
  SchemaFactory.createForClass(FacebookAdAccount);
