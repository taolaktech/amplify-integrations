import { Injectable, Logger } from '@nestjs/common';
// import { Cron, CronExpression } from '@nestjs/schedule';
import { FacebookTokenService } from './facebook-token.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserToken } from 'src/database/schema';

@Injectable()
export class FacebookTokenMonitorService {
  private readonly logger = new Logger(FacebookTokenMonitorService.name);

  constructor(
    private facebookTokenService: FacebookTokenService,
    @InjectModel('user-tokens')
    private userTokenModel: Model<UserToken>,
  ) {}

  /**
   * TODO: Come back to this later
   * Check token health daily and notify users who need to re-authenticate
   */
  // @Cron(CronExpression.EVERY_DAY_AT_2AM)
  // async checkTokenHealth(): Promise<void> {
  //   try {
  //     this.logger.log('Starting daily token health check');

  //     // Get all active Facebook tokens that expire within 7 days
  //     const soonToExpireTokens = await this.userTokenModel.find({
  //       provider: 'facebook',
  //       tokenType: 'access',
  //       isActive: true,
  //       expiresAt: {
  //         $lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  //         $gt: new Date(), // Not already expired
  //       },
  //     });

  //     this.logger.log(
  //       `Found ${soonToExpireTokens.length} tokens expiring within 7 days`,
  //     );

  //     // Clean up expired tokens
  //     const cleanedCount =
  //       await this.facebookTokenService.cleanupExpiredTokens();
  //     this.logger.log(`Cleaned up ${cleanedCount} expired tokens`);
  //   } catch (error) {
  //     this.logger.error('Token health check failed', error);
  //   }
  // }

  /**
   * Manual check for a specific user
   */
  async checkUserTokenHealth(userId: string): Promise<{
    hasValidToken: boolean;
    expiresAt?: Date;
    daysUntilExpiry?: number | null;
    needsReauth: boolean;
  }> {
    try {
      const tokenRecord = await this.userTokenModel.findOne({
        userId,
        provider: 'facebook',
        tokenType: 'access',
        isActive: true,
      });

      if (!tokenRecord) {
        return {
          hasValidToken: false,
          needsReauth: true,
        };
      }

      const daysUntilExpiry = tokenRecord.expiresAt
        ? Math.ceil(
            (tokenRecord.expiresAt.getTime() - Date.now()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

      return {
        hasValidToken: true,
        expiresAt: tokenRecord.expiresAt,
        daysUntilExpiry,
        needsReauth: daysUntilExpiry ? daysUntilExpiry <= 0 : false,
      };
    } catch (error) {
      this.logger.error('Failed to check user token health', error);
      return {
        hasValidToken: false,
        needsReauth: true,
      };
    }
  }
}
