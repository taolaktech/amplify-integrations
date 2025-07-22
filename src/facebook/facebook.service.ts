import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { AppConfigService } from 'src/config/config.service';

@Injectable()
export class FacebookService {
  private FACEBOOK_AD_ACCOUNT_ID: string;
  private FACEBOOK_AD_ACCOUNT_ACCESS_TOKEN: string;

  constructor(private configService: AppConfigService) {
    this.FACEBOOK_AD_ACCOUNT_ID = this.configService.get(
      'FACEBOOK_AD_ACCOUNT_ID',
    );
    this.FACEBOOK_AD_ACCOUNT_ACCESS_TOKEN = this.configService.get(
      'FACEBOOK_AD_ACCOUNT_ACCESS_TOKEN',
    );
  }

  private facebookAdsAxiosInstance() {
    return axios.create({
      baseURL: `https://graph.facebook.com/v22.0`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async createAnAdCampaign(name: string, objective: string) {
    //   curl -X POST \
    // https://graph.facebook.com/v22.0/act_<AD_ACCOUNT_ID>/campaigns \
    // -F 'name=My Campaign' \
    // -F 'objective=LINK_CLICKS' \
    // -F 'status=PAUSED' \
    // -F 'access_token=<ACCESS_TOKEN>'
    const axios = this.facebookAdsAxiosInstance();
    const url = `/act_${this.FACEBOOK_AD_ACCOUNT_ID}/campaigns`;
    const body = {
      name,
      objective,
      status: 'PAUSED',
      access_token: this.FACEBOOK_AD_ACCOUNT_ACCESS_TOKEN,
    };

    const response = await axios.post(url, body);

    return response.data;
  }

  async createAnAdSet(name: string, campaignId: string) {
    //   curl -X POST \
    // https://graph.facebook.com/v22.0/act_<AD_ACCOUNT_ID>/adsets \
    // -F 'name=My Ad Set' \
    // -F 'campaign_id=<CAMPAIGN_ID>' \
    // -F 'daily_budget=1000' \
    // -F 'targeting={"geo_locations":{"countries":["US"]}}' \
    // -F 'access_token=<ACCESS_TOKEN>'
    const axios = this.facebookAdsAxiosInstance();
    const url = `/act_${this.FACEBOOK_AD_ACCOUNT_ID}/adsets`;
    const body = {
      name,
      campaign_id: campaignId,
      daily_budget: 1000,
      targeting: {
        geo_locations: {
          countries: ['US'],
        },
      },
      access_token: this.FACEBOOK_AD_ACCOUNT_ACCESS_TOKEN,
    };
    const response = await axios.post(url, body);

    return response.data;
  }

  async createAnAdCreative(
    title: string,
    caption: string,
    linkUrl: string,
    imageUrl: string,
  ) {
    //   curl -X POST \
    // https://graph.facebook.com/v22.0/act_<AD_ACCOUNT_ID>/adcreatives \
    // -F 'name=Sample Creative' \
    // -F 'object_story_spec={
    //     "page_id": "YOUR_PAGE_ID",
    //     "link_data": {
    //       "message": "Check out our new product!",
    //       "link": "https://www.example.com/product",
    //       "caption": "Our New Product",
    //       "picture": "https://www.example.com/image.jpg",
    //       "call_to_action": {
    //         "type": "SHOP_NOW"
    //       }
    //     }
    //   }' \
    // -F 'access_token=<ACCESS_TOKEN>'
    const axios = this.facebookAdsAxiosInstance();
    const url = `/adcreatives`;
    const body = {
      name: 'Sample Creative',
      object_story_spec: {
        page_id: 'YOUR_PAGE_ID',
        link_data: {
          message: title,
          link: linkUrl,
          caption,
          picture: imageUrl,
          call_to_action: {
            type: 'SHOP_NOW',
          },
        },
      },
    };

    const response = await axios.post(url, body);

    return response.data;
  }

  async createAnAd() {
    //   curl -X POST \
    // https://graph.facebook.com/v22.0/act_<AD_ACCOUNT_ID>/ads \
    // -F 'name=My Ad' \
    // -F 'adset_id=AD_SET_ID' \
    // -F 'creative={"creative_id": "<CREATIVE_ID>"}' \
    // -F 'status=ACTIVE' \
    // -F 'access_token=<ACCESS_TOKEN>'

    const axios = this.facebookAdsAxiosInstance();
    const url = `/act_${this.FACEBOOK_AD_ACCOUNT_ID}/ads`;
    const body = {
      name: 'My Ad',
      adset_id: 'AD_SET_ID',
      creative: {
        creative_id: '<CREATIVE_ID>',
      },
      status: 'ACTIVE',
      access_token: this.FACEBOOK_AD_ACCOUNT_ACCESS_TOKEN,
    };

    const response = await axios.post(url, body);

    return response.data;
  }

  async modifyAnAdCampaign(campaignId: string) {
    //   curl -X POST \
    // https://graph.facebook.com/v22.0/<CAMPAIGN_ID> \
    // -F 'objective=CONVERSIONS' \
    // -F 'daily_budget=2000' \
    // -F 'status=ACTIVE' \
    // -F 'access_token=<ACCESS_TOKEN>'

    const axios = this.facebookAdsAxiosInstance();
    const url = `/${campaignId}`;

    const body = {
      objective: 'CONVERSIONS',
      daily_budget: 2000,
      status: 'ACTIVE',
      access_token: this.FACEBOOK_AD_ACCOUNT_ACCESS_TOKEN,
    };

    const response = await axios.post(url, body);

    return response.data;
  }

  async changeAdCampaignStatus(
    campaignId: string,
    status: 'PAUSED' | 'ARCHIVED',
  ) {
    //   curl -X POST \
    // https://graph.facebook.com/v22.0/<CAMPAIGN_ID> \
    // -F 'status=PAUSED' \
    // -F 'access_token=<ACCESS_TOKEN>'

    const axios = this.facebookAdsAxiosInstance();
    const url = `/${campaignId}`;

    const body = {
      status,
      access_token: this.FACEBOOK_AD_ACCOUNT_ACCESS_TOKEN,
    };

    const response = await axios.post(url, body);

    return response.data;
  }

  async deleteAnAdCampaign(campaignId: string) {
    //   curl -X DELETE \
    // https://graph.facebook.com/v22.0/<CAMPAIGN_ID> \
    // -F 'access_token=<ACCESS_TOKEN>'

    const axios = this.facebookAdsAxiosInstance();
    const url = `/${campaignId}`;

    const body = {
      access_token: this.FACEBOOK_AD_ACCOUNT_ACCESS_TOKEN,
    };

    const response = await axios.delete(url, { data: body });

    return response.data;
  }
}
