/*
  Full resource definition here- https://developers.google.com/google-ads/api/rest/reference/rest
  Under v20 documentation.
*/
import {
  GoogleAdsAdGroupAdAdStrength,
  GoogleAdsAdGroupAdPrimaryStatus,
  GoogleAdsAdGroupAdPrimaryStatusReason,
  GoogleAdsAdGroupAdStatus,
  GoogleAdsAdGroupCriterionStatus,
  GoogleAdsAdGroupStatus,
  GoogleAdsAdGroupType,
  GoogleAdsAdType,
  GoogleAdsAdvertisingChannelType,
  GoogleAdsAssetSource,
  GoogleAdsAssetType,
  GoogleAdsCampaignStatus,
  GoogleAdsKeywordMatchType,
  GoogleAdsResponseContentType,
  GoogleAdsServedAssetFieldType,
} from './google-ads.enum';

export type GoogleAdsResource =
  | 'campaignBudgets'
  | 'campaigns'
  | 'adGroups'
  | 'adGroupAds'
  | 'ads'
  | 'adGroupCriteria'
  | 'assets';

export interface ResourceCreationResponse {
  results: Result[];
}

export interface Result {
  resourceName: string;
}

export interface GoogleAdsRestBody<T> {
  operations: GoogleAdsOperation<T>[];
  partialFailure?: boolean;
  validateOnly?: boolean;
  responseContentType?: GoogleAdsResponseContentType;
}

export type GoogleAdsOperation<T> =
  | GoogleAdsCreateOperation<T>
  | GoogleAdsUpdateOperation<T>
  | GoogleAdsRemoveOperation<T>;

export interface GoogleAdsCreateOperation<T> {
  create: Partial<T>;
}

export interface GoogleAdsUpdateOperation<T> {
  update: Partial<T>;
  updateMask: string;
}

export interface GoogleAdsRemoveOperation<T> {
  remove: Partial<T>;
}

export interface GoogleAdsBudget {
  name: string;
  amountMicros: number;
  resourceName: string;
}

export interface GoogleAdsCampaign {
  id: string;
  resourceName: string;
  name: string;
  startDate: string;
  endDate: string;
  status: GoogleAdsCampaignStatus;
  campaignBudget: string;
  advertisingChannelType: GoogleAdsAdvertisingChannelType;
  networkSettings: Partial<{
    targetGoogleSearch: boolean;
    targetSearchNetwork: boolean;
    targetContentNetwork: boolean;
    targetPartnerSearchNetwork: boolean;
    targetYoutube: boolean;
    targetGoogleTvNetwork: boolean;
  }>;
  baseCampaign: string;
  campaignGroup: string;
  finalUrlSuffix: string;
  optimizationScore: number;
  urlExpansionOptOut: boolean;
  brandGuidelinesEnabled: boolean;
}

export interface GoogleAdsAdGroup {
  id: string;
  resourceName: string;
  name: string;
  status: GoogleAdsAdGroupStatus;
  campaign: string;
  type: GoogleAdsAdGroupType;
}

export interface GoogleAdsAdGroupAd {
  resourceName: string;
  status: GoogleAdsAdGroupAdStatus;
  primaryStatus: GoogleAdsAdGroupAdPrimaryStatus;
  primaryStatusReason: GoogleAdsAdGroupAdPrimaryStatusReason;
  ad: Partial<GoogleAdsAd>;
  adStrength: GoogleAdsAdGroupAdAdStrength;
  actionItems: [string];
  labels: [string];
  adGroup: string;
}

export interface GoogleAdsAd {
  resourceName: string;
  type: GoogleAdsAdType;
  finalUrls: [string];
  id: string;
  trackingUrlTemplate: string;
  finalUrlSuffix: string;
  displayUrl: string;
  addedByGoogleAds: boolean;
  name: string;
  responsiveSearchAd: Partial<{
    headlines: [GoogleAdsAdTextAsset];
    descriptions: [GoogleAdsAdTextAsset];
    path1: string;
    path2: string;
  }>;
  textAd: {
    headline: string;
    description1: string;
    description2: string;
  };
}

export interface GoogleAdsAssets {
  resourceName: string;
  type: GoogleAdsAssetType;
  finalUrls: [string];
  finalMobileUrls: [string];
  textAsset: {
    text: string;
  };
  id: string;
  name: string;
  trackingUrlTemplate: string;
  finalUrlSuffix: string;
  source: GoogleAdsAssetSource;
}

export interface GoogleAdsAdTextAsset {
  text: string;
  pinnedField?: GoogleAdsServedAssetFieldType;
  // "assetPerformanceLabel": enum (AssetPerformanceLabel),
}

export interface GoogleAdsAdGroupCriterion {
  id: string;
  resourceName: string;
  displayName: string;
  adGroup: string;
  status: GoogleAdsAdGroupCriterionStatus;
  keyword: {
    matchType: GoogleAdsKeywordMatchType;
    text: string;
  };
}
