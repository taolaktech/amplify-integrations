import { ApiProperty } from '@nestjs/swagger';

export class SystemUserPermissionDto {
  @ApiProperty({
    example: 'ASSIGNED',
    enum: [
      'NOT_REQUESTED',
      'ASSIGNMENT_PENDING',
      'ASSIGNED',
      'ASSIGNMENT_FAILED',
    ],
  })
  assignmentStatus: string;

  @ApiProperty({ example: ['MANAGE', 'ADVERTISE', 'ANALYZE'], type: [String] })
  grantedTasks: string[];

  @ApiProperty({ example: '2024-01-01T10:00:00Z' })
  lastStatusCheck: Date;

  @ApiProperty({ example: 'Permission check failed', required: false })
  assignmentError?: string;
}

export class CapabilitiesDto {
  @ApiProperty({ example: true })
  canCreateCampaigns: boolean;

  @ApiProperty({ example: true })
  canManageAds: boolean;

  @ApiProperty({ example: true })
  canViewInsights: boolean;

  @ApiProperty({ example: ['MANAGE', 'ADVERTISE', 'ANALYZE'], type: [String] })
  grantedTasks: string[];

  @ApiProperty({ example: [], type: [String] })
  missingTasks: string[];
}

export class FacebookAdAccountDto {
  @ApiProperty({ example: 'act_1087932189349950' })
  accountId: string;

  @ApiProperty({ example: 'My Store Ads', required: false })
  name?: string;

  @ApiProperty({ example: 'USD', required: false })
  currency?: string;

  @ApiProperty({ example: 'My Business', required: false })
  businessName?: string;

  @ApiProperty({ example: true })
  isPrimary: boolean;

  @ApiProperty({
    example: 'READY_FOR_CAMPAIGNS',
    enum: [
      'SETUP_INCOMPLETE',
      'SYSTEM_USER_ASSIGNED',
      'ASSIGNMENT_FAILED',
      'READY_FOR_CAMPAIGNS',
    ],
  })
  integrationStatus: string;

  @ApiProperty({ type: SystemUserPermissionDto, required: false })
  systemUserPermission?: SystemUserPermissionDto;

  @ApiProperty({ type: CapabilitiesDto, required: false })
  capabilities?: CapabilitiesDto;
}

export class TokenStatusDto {
  @ApiProperty({ example: true })
  isValid: boolean;

  @ApiProperty({ example: '2024-02-15T10:00:00Z', required: false })
  expiresAt?: Date;

  @ApiProperty({ example: 45, required: false })
  daysUntilExpiry?: number;
}

export class OAuthCallbackDataDto {
  @ApiProperty({ type: [FacebookAdAccountDto] })
  adAccounts: FacebookAdAccountDto[];

  @ApiProperty({ type: [Object], description: 'Facebook pages data' })
  pages: any[];

  @ApiProperty({ example: true })
  tokenStored: boolean;

  @ApiProperty({ example: true })
  needsAdAccountSelection: boolean;
}

export class AdAccountsListDataDto {
  @ApiProperty({ type: [FacebookAdAccountDto] })
  adAccounts: FacebookAdAccountDto[];

  @ApiProperty({ example: true })
  hasPrimary: boolean;

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({ example: 1 })
  readyForCampaigns: number;

  @ApiProperty({ example: 2 })
  needsSetup: number;

  @ApiProperty({ example: 0 })
  assignmentFailed: number;
}

export class PrimaryAccountDataDto {
  @ApiProperty({ type: FacebookAdAccountDto })
  account: FacebookAdAccountDto;

  @ApiProperty({
    example: 'READY_FOR_CAMPAIGNS',
    enum: [
      'SETUP_INCOMPLETE',
      'SYSTEM_USER_ASSIGNED',
      'ASSIGNMENT_FAILED',
      'READY_FOR_CAMPAIGNS',
    ],
  })
  integrationStatus: string;

  @ApiProperty({ type: SystemUserPermissionDto })
  systemUserPermission: SystemUserPermissionDto;

  @ApiProperty({ type: CapabilitiesDto })
  capabilities: CapabilitiesDto;

  @ApiProperty({ example: true })
  readyForCampaigns: boolean;
}

export class SelectPrimaryDataDto {
  @ApiProperty({ example: 'act_1087932189349950' })
  adAccountId: string;

  @ApiProperty({ example: 'ASSIGNED', enum: ['ASSIGNED', 'ASSIGNMENT_FAILED'] })
  assignmentStatus: string;

  @ApiProperty({ example: true })
  canCreateCampaigns: boolean;

  @ApiProperty({ example: ['MANAGE', 'ADVERTISE', 'ANALYZE'], type: [String] })
  grantedTasks: string[];

  @ApiProperty({ example: 'Account selected successfully' })
  message: string;
}

export class PermissionStatusDataDto {
  @ApiProperty({
    example: 'ASSIGNED',
    enum: ['NOT_REQUESTED', 'ASSIGNED', 'ASSIGNMENT_FAILED'],
  })
  assignmentStatus: string;

  @ApiProperty({ example: true })
  canCreateCampaigns: boolean;

  @ApiProperty({ example: ['MANAGE', 'ADVERTISE', 'ANALYZE'], type: [String] })
  grantedTasks: string[];

  @ApiProperty({ example: [], type: [String] })
  missingTasks: string[];

  @ApiProperty({ example: '2024-01-01T10:00:00Z' })
  lastChecked: Date;

  @ApiProperty({
    example: 'READY_FOR_CAMPAIGNS',
    enum: [
      'SETUP_INCOMPLETE',
      'SYSTEM_USER_ASSIGNED',
      'ASSIGNMENT_FAILED',
      'READY_FOR_CAMPAIGNS',
    ],
  })
  integrationStatus: string;
}

export class TokenStatusDataDto {
  @ApiProperty({ example: true })
  hasValidToken: boolean;

  @ApiProperty({ example: '2024-02-15T10:00:00Z', required: false })
  expiresAt?: Date;

  @ApiProperty({ example: 45, required: false })
  daysUntilExpiry?: number;

  @ApiProperty({ example: false })
  needsReauth: boolean;

  // @ApiProperty({ example: 15, required: false })
  // tokenAge?: number;

  // @ApiProperty({ example: '2024-01-01T10:00:00Z', required: false })
  // lastValidated?: Date;

  // @ApiProperty({
  //   example: 'facebook_provided',
  //   enum: ['facebook_provided', 'calculated_60_days'],
  // })
  // tokenSource: string;

  @ApiProperty({ example: null, required: false })
  reAuthUrl?: string;
}

export class NewAccountDto {
  @ApiProperty({ example: 'act_1087932189349950' })
  accountId: string;

  @ApiProperty({ example: 'My New Store Ads' })
  name: string;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 'My Business' })
  businessName: string;
}

export class PermissionUpdateDto {
  @ApiProperty({ example: 'act_1087932189349950' })
  accountId: string;

  @ApiProperty({ example: 'SETUP_INCOMPLETE' })
  oldStatus: string;

  @ApiProperty({ example: 'READY_FOR_CAMPAIGNS' })
  newStatus: string;

  @ApiProperty({ type: CapabilitiesDto })
  capabilities: CapabilitiesDto;
}

export class RefreshAccountsDataDto {
  @ApiProperty({ example: 1 })
  newAccountsFound: number;

  @ApiProperty({ example: 2 })
  accountsUpdated: number;

  @ApiProperty({ example: 1 })
  permissionsUpdated: number;

  @ApiProperty({ example: 0 })
  accountsRemoved: number;

  @ApiProperty({ example: 4 })
  totalAccounts: number;

  @ApiProperty({ type: [NewAccountDto] })
  newAccounts: NewAccountDto[];

  @ApiProperty({ type: [PermissionUpdateDto] })
  permissionUpdates: PermissionUpdateDto[];

  @ApiProperty({ type: TokenStatusDto })
  tokenStatus: TokenStatusDto;
}

export class FacebookOAuthCallbackResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Facebook OAuth callback handled successfully' })
  message: string;

  @ApiProperty({ type: OAuthCallbackDataDto })
  data: OAuthCallbackDataDto;
}

export class AdAccountsListResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Ad accounts retrieved successfully' })
  message: string;

  @ApiProperty({ type: AdAccountsListDataDto })
  data: AdAccountsListDataDto;
}

export class PrimaryAccountResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Primary ad account retrieved successfully' })
  message: string;

  @ApiProperty({ type: PrimaryAccountDataDto, required: false })
  data?: PrimaryAccountDataDto;

  @ApiProperty({ example: true })
  hasPrimary: boolean;
}

export class SelectPrimaryResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Primary ad account set and ready for campaigns' })
  message: string;

  @ApiProperty({ type: SelectPrimaryDataDto })
  data: SelectPrimaryDataDto;
}

export class PermissionStatusResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Permission status updated successfully' })
  message: string;

  @ApiProperty({ type: PermissionStatusDataDto })
  data: PermissionStatusDataDto;
}

export class TokenStatusResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Token is healthy and valid for 45 more days' })
  message: string;

  @ApiProperty({ type: TokenStatusDataDto })
  data: TokenStatusDataDto;
}

export class RefreshAccountsResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    example: 'Found 1 new ad account and updated 2 existing accounts',
  })
  message: string;

  @ApiProperty({ type: RefreshAccountsDataDto })
  data: RefreshAccountsDataDto;
}

export class RemoveAccountResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Ad account removed successfully' })
  message: string;
}
