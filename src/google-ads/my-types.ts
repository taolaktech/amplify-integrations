import {
  GoogleAdsAssetFieldType,
  GoogleAdsAssetType,
  GoogleAdsKeywordMatchType,
  GoogleAdsResponseContentType,
  GoogleAdsServedAssetFieldType,
} from './api/resource-api/enums';
import { GoogleAdsCampaign } from './api/resource-api/types';

export type GoogleAdsResourceRequestOptions = {
  validateOnly?: boolean;
  partialFailure?: boolean;
  responseContentType?: GoogleAdsResponseContentType;
};
export type CreateTargetRoasBiddingStrategyBody = {
  name: string;
  targetRoas: number;
  cpcBidCeilingMicros: number;
  cpcBidFloorMicros: number;
};

export type CreateMaximizeConversionsBiddingStrategyBody = {
  name: string;
  targetCpaMicros: number;
  cpcBidCeilingMicros: number;
  cpcBidFloorMicros: number;
};

export type CreateCampaignBody = {
  name: string;
  campaignBudget: string;
  startDate?: Date;
  endDate: Date;
  biddingStrategy: string;
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

export type CreateConversionActionBody = {
  name: string;
  customerId: string;
};

export type CreateCustomerAssetBody = {
  customerId: string;
  assetResourceName: string;
  assetFieldType: GoogleAdsAssetFieldType;
};

export type CreateCampaignAssetBody = {
  campaignResourceName: string;
  assetResourceName: string;
  assetFieldType: GoogleAdsAssetFieldType;
};

export type CreateAssetBody = {
  customerId: string;
  type: GoogleAdsAssetType;
  name?: string;
  finalUrls?: string[];
  text?: string;
  image?: string;
};
