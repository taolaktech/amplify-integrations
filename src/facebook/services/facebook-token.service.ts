// amplify-integrations/src/facebook/services/facebook-token.service.ts#L1-150
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import axios from 'axios';
import { UserToken } from 'src/database/schema';

export interface TokenData {
  access_token: string;
  expires_in?: number;
  token_type: string;
}

export interface TokenValidationResult {
  isValid: boolean;
  expiresAt?: Date;
  scopes?: string[];
  userId?: string;
}

@Injectable()
export class FacebookTokenService {
  private readonly logger = new Logger(FacebookTokenService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    private config: ConfigService,
    @InjectModel('user-tokens')
    private userTokenModel: Model<UserToken>,
  ) {
    const keyString = this.config.get<string>(
      'FACEBOOK_TOKEN_ENCRYPTION_KEY',
    ) as string;

    if (!keyString) {
      throw new Error('FACEBOOK_TOKEN_ENCRYPTION_KEY is not defined');
    }

    // convert encryption key to buffer
    this.encryptionKey = Buffer.from(keyString, 'hex');

    if (this.encryptionKey.length !== 32) {
      throw new Error(
        'FACEBOOK_TOKEN_ENCRYPTION_KEY must be exactly 32 bytes when using AES-256-GCM',
      );
    }
  }

  /**
   * Encrypt a token for secure database storage
   */
  encryptToken(token: string): string {
    try {
      // Generate a random initialization vector (IV) - like a unique serial number
      // This ensures the same token encrypted twice produces different results
      const iv = crypto.randomBytes(16);

      // Create GCM cipher with our algorithm, secret key, and the unique IV
      // GCM mode provides both encryption and authentication in one step
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );

      // Set Additional Authenticated Data (AAD)
      cipher.setAAD(Buffer.from('facebook-token'));

      // Perform the actual encryption in two phases
      // Phase 1: Process the token text and convert to encrypted hex
      let encrypted = cipher.update(token, 'utf8', 'hex');
      // Phase 2: Finalize encryption and complete any remaining operations
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Format: iv:authTag:encryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      this.logger.error('Failed to encrypt token', error);
      throw new Error('Token encryption failed');
    }
  }

  /**
   * Decrypt a token from database storage
   */
  decryptToken(encryptedToken: string): string {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');

      if (!ivHex || !authTagHex || !encrypted) {
        throw new Error('Invalid encrypted token format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );
      decipher.setAAD(Buffer.from('facebook-token'));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt token', error);
      throw new Error('Token decryption failed');
    }
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   * This can only be done ONCE per short-lived token
   */
  async exchangeForLongLivedToken(shortLivedToken: string): Promise<TokenData> {
    try {
      this.logger.debug('Exchanging short-lived token for long-lived token');

      const response = await axios.get(
        'https://graph.facebook.com/v23.0/oauth/access_token',
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: this.config.get('FACEBOOK_APP_ID'),
            client_secret: this.config.get('FACEBOOK_APP_SECRET'),
            fb_exchange_token: shortLivedToken,
          },
        },
      );

      this.logger.debug('Successfully exchanged for long-lived token');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange token', error.response?.data);
      throw new Error('Token exchange failed');
    }
  }

  /**
   * Validate if a token is still valid by making a test API call
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      const response = await axios.get('https://graph.facebook.com/v19.0/me', {
        params: {
          access_token: token,
          fields: 'id,name',
        },
      });

      // If we get here, token is valid
      return {
        isValid: true,
        userId: response.data.id,
      };
    } catch (error) {
      this.logger.debug('Token validation failed', error.response?.data);

      // Check error type
      const errorCode = error.response?.data?.error?.code;
      const errorType = error.response?.data?.error?.type;

      if (errorCode === 190 || errorType === 'OAuthException') {
        return { isValid: false };
      }

      throw error; // Re-throw non-auth errors
    }
  }

  /**
   * Get token debug information from Facebook
   */
  async getTokenInfo(token: string): Promise<any> {
    try {
      const appToken = await this.getAppAccessToken();

      const response = await axios.get(
        'https://graph.facebook.com/v19.0/debug_token',
        {
          params: {
            input_token: token,
            access_token: appToken,
          },
        },
      );

      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to get token info', error.response?.data);
      throw error;
    }
  }

  /**
   * Get app access token for debugging and validation
   */
  private async getAppAccessToken(): Promise<string> {
    try {
      const response = await axios.get(
        'https://graph.facebook.com/v23.0/oauth/access_token',
        {
          params: {
            client_id: this.config.get('FACEBOOK_APP_ID'),
            client_secret: this.config.get('FACEBOOK_APP_SECRET'),
            grant_type: 'client_credentials',
          },
        },
      );

      return response.data.access_token;
    } catch (error) {
      this.logger.error('Failed to get app access token', error.response?.data);
      throw error;
    }
  }

  /**
   * Store token in database with encryption
   */
  async storeUserToken(
    userId: string,
    token: string,
    tokenType: 'access' | 'page',
    expiresIn?: number,
    scope?: string,
  ): Promise<void> {
    try {
      const now = new Date();
      const encryptedToken = this.encryptToken(token);
      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000)
        : new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      // Remove old tokens of the same type
      await this.userTokenModel.deleteMany({
        userId,
        provider: 'facebook',
        tokenType,
      });

      // Store new token
      await this.userTokenModel.create({
        userId,
        provider: 'facebook',
        tokenType,
        encryptedToken,
        expiresAt,
        scope,
        isActive: true,
      });

      this.logger.debug(`Stored ${tokenType} token for user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to store token', error);
      throw error;
    }
  }

  private calculateDefaultExpiry(tokenCreatedAt: Date): Date {
    // Facebook long-lived tokens are documented as 60 days
    return new Date(tokenCreatedAt.getTime() + 60 * 24 * 60 * 60 * 1000);
  }

  /**
   * Get user's stored token from database
   */
  async getUserToken(
    userId: string,
    tokenType: 'access' | 'page' = 'access',
  ): Promise<string | null> {
    try {
      const tokenRecord = await this.userTokenModel
        .findOne({
          userId,
          provider: 'facebook',
          tokenType,
          isActive: true,
        })
        .sort({ createdAt: -1 }); // Get the latest token

      if (!tokenRecord) {
        this.logger.debug(`No ${tokenType} token found for user ${userId}`);
        return null;
      }

      // Check if token is expired
      if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date()) {
        this.logger.debug(`Token expired for user ${userId}`);

        // Mark as inactive
        await this.userTokenModel.updateOne(
          { _id: tokenRecord._id },
          { isActive: false },
        );

        return null;
      }

      return this.decryptToken(tokenRecord.encryptedToken);
    } catch (error) {
      this.logger.error('Failed to get user token', error);
      return null;
    }
  }

  /**
   * Check if user needs to re-authenticate
   */
  async doesUserNeedReauth(userId: string): Promise<{
    needsReauth: boolean;
    reason?: string;
    lastTokenDate?: Date;
  }> {
    try {
      const token = await this.getUserToken(userId);

      if (!token) {
        return {
          needsReauth: true,
          reason: 'No valid token found',
        };
      }

      // Validate token with Facebook
      const validation = await this.validateToken(token);

      if (!validation.isValid) {
        return {
          needsReauth: true,
          reason: 'Token is invalid or expired',
        };
      }

      return { needsReauth: false };
    } catch (error) {
      this.logger.error('Failed to check reauth status', error);
      return {
        needsReauth: true,
        reason: 'Error validating token',
      };
    }
  }

  /**
   * Clean up expired tokens (should be run as a cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await this.userTokenModel.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      this.logger.debug(`Cleaned up ${result.deletedCount} expired tokens`);
      return result.deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens', error);
      return 0;
    }
  }
}
