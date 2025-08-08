import { FacebookAdAccountDocument } from '../../database/schema';

export interface IRefreshAdAccountResponse {
  newAccounts: FacebookAdAccountDocument[];
  updatedAccounts: FacebookAdAccountDocument[];
  permissionUpdates: {
    accountId: string;
    oldStatus: string;
    newStatus: string;
    capabilities: any;
  }[];
  removedAccounts: string[];
  totalAccounts: number;
  tokenStatus: {
    isValid: boolean;
    expiresAt?: Date;
  };
}

export interface IGetPrimaryAdAccountWithStatusResponse {
  data?: {
    account: {
      accountId: string;
      name?: string;
      currency?: string;
      businessName?: string;
      isPrimary: boolean;
    };
    integrationStatus: string;
    systemUserPermission?: {
      assignmentStatus: string;
      grantedTasks: string[];
      lastStatusCheck: Date;
      assignmentError?: string;
    };
    capabilities: {
      canCreateCampaigns: boolean;
      canManageAds: boolean;
      canViewInsights: boolean;
      grantedTasks: string[];
      missingTasks: string[];
    };
    readyForCampaigns: boolean;
  };
  message?: string;
}
