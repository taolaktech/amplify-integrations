import {
  GoogleAdsKeywordMatchType,
  GoogleAdsResponseContentType,
  GoogleAdsServedAssetFieldType,
} from './google-ads.enum';
import { GoogleAdsCampaign } from './google-ads.types';

export type GoogleAdsRequestOptions = {
  validateOnly?: boolean;
  partialFailure?: boolean;
  responseContentType?: GoogleAdsResponseContentType;
};

export type CreateCampaignBody = {
  name: string;
  campaignBudget: string;
  startDate: Date;
  endDate: Date;
  targetRoas: {
    targetRoas: number;
    cpcBidCeilingMicros: number;
    cpcBidFloorMicros: number;
  };
};

export type CreateAdGroupBody = {
  campaignResourceName: string;
  adGroupName: string;
};

export type CreateAdGroupAdBody = {
  adGroupResourceName: string;
  adGroupAdName: string;
  finalUrls: string[];
  headlines: {
    text: string;
    pinnedField?: GoogleAdsServedAssetFieldType;
  }[];
  descriptions: {
    text: string;
    pinnedField?: GoogleAdsServedAssetFieldType;
  }[];
  path1?: string;
  path2?: string;
};

export type AddKeywordsToAdGroupBody = {
  adGroupResourceName: string;
  keywords: {
    text: string;
    matchType: GoogleAdsKeywordMatchType;
  }[];
};

export type AddGeoTargetingToCampaignBody = {
  campaignResourceName: string;
  locale?: string;
  countryCode: string;
  locationNames: string[];
};

export type UpdateCampaignBody = {
  campaign: Partial<GoogleAdsCampaign>;
  updateMask: string;
};
