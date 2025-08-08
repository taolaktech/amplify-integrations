import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SystemUserAssignmentRequest {
  adAccountId: string;
  permissions: string[];
  // userId: string;
}

export interface PermissionRequestResult {
  success: boolean;
  requestId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  message: string;
}

@Injectable()
export class FacebookBusinessManagerService {
  private readonly logger = new Logger(FacebookBusinessManagerService.name);
  private readonly graph: AxiosInstance;
  private readonly systemUserToken: string;
  private readonly systemUserId: string;
  private readonly businessId: string;

  constructor(private config: ConfigService) {
    this.systemUserToken = this.config.get<string>(
      'FACEBOOK_SYSTEM_USER_TOKEN',
    ) as string;
    this.systemUserId = this.config.get<string>(
      'AMPLIFY_SYSTEM_USER_ID',
    ) as string;
    this.businessId = this.config.get<string>('AMPLIFY_BUSINESS_ID') as string;

    this.graph = axios.create({
      baseURL: 'https://graph.facebook.com/v23.0',
      params: {
        access_token: this.systemUserToken,
      },
    });
  }

  /**
   * Request system user access to user's ad account
   */
  async requestSystemUserAccess(
    request: SystemUserAssignmentRequest,
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.debug(
        `Requesting system user access to ad account: ${request.adAccountId}`,
      );

      // Step 1: Create permission request
      const response = await this.graph.post(
        `/${request.adAccountId}/assigned_users`,
        {
          user: this.systemUserId,
          tasks: request.permissions, // ['MANAGE', 'ADVERTISE', 'ANALYZE']
        },
      );

      this.logger.debug('System user assignment response:', response.data);
      // Facebook returns: { "success": true } on successful assignment
      if (response.data.success) {
        return {
          success: true,
          message: 'System user successfully assigned to ad account',
        };
      } else {
        throw new InternalServerErrorException(
          'Assignment request did not return success',
        );
      }
    } catch (error) {
      this.logger.error('Failed to request system user access', {
        error: error.response?.data,
        adAccountId: request.adAccountId,
        systemUserId: this.systemUserId,
      });

      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message;

      if (errorCode === 100) {
        throw new BadRequestException(
          `Invalid system user ID or ad account format: ${errorMessage}`,
        );
      }

      if (errorCode === 190) {
        throw new UnauthorizedException(
          `Invalid system user token: ${errorMessage}`,
        );
      }

      if (errorCode === 200) {
        throw new BadRequestException(
          'Insufficient permissions to assign users to this ad account',
        );
      }

      throw new InternalServerErrorException(
        `Failed to request system user access: ${errorMessage}`,
      );
    }
  }

  /**
   * Check the status of system user permissions
   */
  async checkSystemUserAssignment(adAccountId: string): Promise<{
    isAssigned: boolean;
    grantedTasks: string[];
    systemUserDetails?: any;
  }> {
    try {
      const response = await this.graph.get(`/${adAccountId}/assigned_users`, {
        params: {
          // fields: 'id,name,email,tasks,status',
          business: this.businessId,
        },
      });

      const users = response.data.data || [];

      // Find our system user by ID
      // Note: System users might appear with different ID formats in responses
      const systemUser = users.find((user: any) => {
        // System users might have different ID representation
        return (
          user.id === this.systemUserId ||
          user.id.toString() === this.systemUserId.toString()
        );
      });
      if (systemUser) {
        this.logger.debug(`System user found in ad account ${adAccountId}:`, {
          id: systemUser.id,
          name: systemUser.name,
          tasks: systemUser.tasks,
        });

        return {
          isAssigned: true,
          grantedTasks: systemUser.tasks || [],
          systemUserDetails: systemUser,
        };
      } else {
        this.logger.debug(
          `System user ${this.systemUserId} not found in ad account ${adAccountId}`,
        );
        return {
          isAssigned: false,
          grantedTasks: [],
        };
      }
    } catch (error) {
      this.logger.error(
        'Failed to check system user assignment',
        error.response?.data,
      );

      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message;

      if (errorCode === 190) {
        throw new UnauthorizedException(
          `Invalid system user token: ${errorMessage}`,
        );
      }

      if (errorCode === 200) {
        throw new BadRequestException(
          `Insufficient permissions to check ad account users: ${errorMessage}`,
        );
      }

      throw new InternalServerErrorException(
        `Failed to check system user assignment: ${errorMessage}`,
      );
    }
  }

  /**
   * Get system user capabilities for an ad account
   */
  async getSystemUserCapabilities(adAccountId: string): Promise<{
    canCreateCampaigns: boolean;
    canManageAds: boolean;
    canViewInsights: boolean;
    grantedTasks: string[];
    missingTasks: string[];
  }> {
    try {
      const assignment = await this.checkSystemUserAssignment(adAccountId);

      if (!assignment.isAssigned) {
        return {
          canCreateCampaigns: false,
          canManageAds: false,
          canViewInsights: false,
          grantedTasks: [],
          missingTasks: ['MANAGE', 'ADVERTISE', 'ANALYZE'],
        };
      }

      const grantedTasks = assignment.grantedTasks;
      const requiredTasks = ['MANAGE', 'ADVERTISE', 'ANALYZE'];
      const missingTasks = requiredTasks.filter(
        (task) => !grantedTasks.includes(task),
      );

      return {
        canCreateCampaigns:
          grantedTasks.includes('ADVERTISE') && grantedTasks.includes('MANAGE'),
        canManageAds: grantedTasks.includes('MANAGE'),
        canViewInsights: grantedTasks.includes('ANALYZE'),
        grantedTasks,
        missingTasks,
      };
    } catch (error) {
      this.logger.error('Failed to get system user capabilities', error);
      return {
        canCreateCampaigns: false,
        canManageAds: false,
        canViewInsights: false,
        grantedTasks: [],
        missingTasks: ['MANAGE', 'ADVERTISE', 'ANALYZE'],
      };
    }
  }

  /**
   * Remove system user access from ad account
   */
  async removeSystemUserAccess(adAccountId: string): Promise<void> {
    try {
      const response = await this.graph.delete(
        `/${adAccountId}/assigned_users`,
        {
          data: {
            user: this.systemUserId,
          },
        },
      );

      this.logger.debug(
        `System user removed from ad account ${adAccountId}:`,
        response.data,
      );

      if (!response.data.success) {
        throw new InternalServerErrorException(
          'Remove operation did not return success',
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to remove system user access',
        error.response?.data,
      );

      const errorMessage = error.response?.data?.error?.message;
      throw new InternalServerErrorException(
        `Failed to remove system user access: ${errorMessage}`,
      );
    }
  }
}
