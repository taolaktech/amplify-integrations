export type GoogleAdsCustomerMethod =
  | 'createCustomerClient'
  | 'mutate'
  | 'generateKeywordIdeas';

export type GoogleAdsCustomerRequestOptions = {
  validateOnly?: boolean;
};

enum AccessRole {
  UNSPECIFIED = 'UNSPECIFIED', // Not specified.
  UNKNOWN = 'UNKNOWN', // Used for return value only. Represents value unknown in this version.
  ADMIN = 'ADMIN', // Owns its account and can control the addition of other users.
  STANDARD = 'STANDARD', // Can modify campaigns, but can't affect other users.
  READ_ONLY = 'READ_ONLY', // Can view campaigns and account changes, but cannot make edits.
  EMAIL_ONLY = 'EMAIL_ONLY', // Role for "em...
}

export enum CustomerAccountStatus {
  UNSPECIFIED = 'UNSPECIFIED', // Not specified.
  UNKNOWN = 'UNKNOWN', // Used for return value only. Represents value unknown in this version.
  ENABLED = 'ENABLED', // Indicates an active account able to serve ads.
  CANCELED = 'CANCELED', // Indicates a canceled account unable to serve ads. Can be reactivated by an admin user.
  SUSPENDED = 'SUSPENDED', // Indicates a suspended account unable to serve ads. May only be activated by Google support.
  CLOSED = 'CLOSED', // Indicates a closed account unable to serve ads. Test account will also have CLOSED status. Status is permanent and may not be reopened.
}

export type CreateCustomerRequestBody = {
  customerClient: Partial<GoogleAdsCustomer>;
  accessRole: AccessRole;
  validateOnly: boolean;
  emailAddress: string;
};

export type CreateCustomerResponse = {
  resourceName: string;
  invitationLink: string;
};

export type GoogleAdsCustomer = {
  resourceName: string;
  optimizationScoreWeight: number;
  status: CustomerAccountStatus;
  id: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  trackingUrlTemplate: string;
  finalUrlSuffix: string;
  autoTaggingEnabled: boolean;
  hasPartnersBadge: boolean;
  manager: boolean;
  testAccount: boolean;
  optimizationScore: number;
  locationAssetAutoMigrationDone: boolean;
  imageAssetAutoMigrationDone: boolean;
  locationAssetAutoMigrationDoneDateTime: string;
  imageAssetAutoMigrationDoneDateTime: string;
};
