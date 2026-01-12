import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ShopifyService } from 'src/shopify/shopify.service';
import { GoogleAdsAuthService } from 'src/google-ads/services/google-ads-auth.service';
import { FacebookAuthService } from 'src/facebook/facebook-auth/facebook-auth.service';
import { DisconnectIntegrationDto, IntegrationPlatform } from './dto';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectModel('business') private businessModel: Model<any>,
    @InjectModel('shopify-accounts') private shopifyAccountModel: Model<any>,
    @InjectModel('google-ads-accounts')
    private googleAdsAccountModel: Model<any>,
    @InjectModel('facebook-ad-accounts')
    private facebookAdAccountModel: Model<any>,
    @InjectModel('facebook-pages') private facebookPageModel: Model<any>,
    @InjectModel('instagram-accounts')
    private instagramAccountModel: Model<any>,
    private readonly shopifyService: ShopifyService,
    private readonly googleAdsAuthService: GoogleAdsAuthService,
    private readonly facebookAuthService: FacebookAuthService,
  ) {}

  async getStatus(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    const business = (await this.businessModel
      .findOne({ userId: userObjectId })
      .lean()) as any | null;

    if (!business) {
      throw new BadRequestException('Business not found for this user');
    }

    const integrations = business?.integrations || {};

    const shopifyAccountId = integrations?.shopify?.shopifyAccount;
    const googleConnectionId =
      integrations?.googleAds?.primaryAdAccountConnection;
    const facebook = integrations?.facebook;
    const instagram = integrations?.instagram;

    const [
      shopifyAccount,
      googleConnection,
      facebookAdAccount,
      facebookPage,
      instagramAccount,
    ] = (await Promise.all([
      shopifyAccountId
        ? this.shopifyAccountModel.findById(shopifyAccountId).lean()
        : null,
      googleConnectionId
        ? this.googleAdsAccountModel.findById(googleConnectionId).lean()
        : null,
      facebook?.adAccountId
        ? this.facebookAdAccountModel
            .findOne({ userId, accountId: facebook.adAccountId })
            .lean()
        : null,
      facebook?.pageId
        ? this.facebookPageModel
            .findOne({ userId, pageId: facebook.pageId })
            .lean()
        : null,
      instagram?.instagramAccountId
        ? this.instagramAccountModel
            .findOne({
              userId,
              instagramAccountId: instagram.instagramAccountId,
            })
            .lean()
        : null,
    ])) as any[];

    const shopifyConnected = Boolean(shopifyAccount);
    const googleAdsConnected = Boolean(googleConnection);
    const facebookConnected = Boolean(
      facebook?.adAccountId && facebook?.pageId,
    );
    const instagramConnected = Boolean(
      instagram?.adAccountId && instagram?.instagramAccountId,
    );

    return {
      integrations,
      status: {
        shopify: {
          connected: shopifyConnected,
          shop: shopifyAccount?.shop,
          myshopifyDomain: shopifyAccount?.myshopifyDomain,
          accountStatus: shopifyAccount?.accountStatus,
          id: shopifyAccount?._id?.toString(),
        },
        googleAds: {
          connected: googleAdsConnected,
          connectionId: googleConnection?._id?.toString(),
          email: googleConnection?.email,
          googleUserId: googleConnection?.googleUserId,
          primaryCustomerAccount: googleConnection?.primaryCustomerAccount,
          primaryAdAccountState: googleConnection?.primaryAdAccountState,
        },
        facebook: {
          connected: facebookConnected,
          adAccountId: facebook?.adAccountId,
          pageId: facebook?.pageId,
          adAccountName: facebookAdAccount?.name,
          metaPixelId: facebookAdAccount?.metaPixelId,
          integrationStatus: facebookAdAccount?.integrationStatus,
          pageName: facebookPage?.pageName,
        },
        instagram: {
          connected: instagramConnected,
          adAccountId: instagram?.adAccountId,
          instagramAccountId: instagram?.instagramAccountId,
          instagramUsername: instagramAccount?.username,
          associatedAdAccountId: instagramAccount?.associatedAdAccountId,
        },
      },
    };
  }

  async disconnect(userId: string, body: DisconnectIntegrationDto) {
    switch (body.platform) {
      case IntegrationPlatform.SHOPIFY:
        await this.shopifyService.disconnectShopify(userId);
        break;
      case IntegrationPlatform.GOOGLE_ADS:
        await this.googleAdsAuthService.disconnectGoogleAds(userId);
        break;
      case IntegrationPlatform.FACEBOOK:
        await this.facebookAuthService.disconnectFacebook(userId);
        break;
      case IntegrationPlatform.INSTAGRAM:
        await this.facebookAuthService.disconnectInstagram(userId);
        break;
      default:
        throw new BadRequestException('Unsupported platform');
    }

    return this.getStatus(userId);
  }
}
