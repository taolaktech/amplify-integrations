/*
  Full resource definition here- https://developers.google.com/google-ads/api/rest/reference/rest
  Under v20 documentation.
*/
import {
  GoogleAdsAdGroupAdAdStrength,
  GoogleAdsAdGroupAdStatus,
  GoogleAdsAdGroupStatus,
  GoogleAdsAdGroupType,
  GoogleAdsAdType,
  GoogleAdsAdvertisingChannelType,
  GoogleAdsCampaignStatus,
  GoogleAdsResponseContentType,
} from './google-ads.enum';

export type GoogleAdsResource =
  | 'campaignBudgets'
  | 'campaigns'
  | 'adGroups'
  | 'adGroupAds'
  | 'ads';

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
  networkSettings: Partial<NetworkSettings>;
}

export interface NetworkSettings {
  targetGoogleSearch: boolean;
  targetSearchNetwork: boolean;
  targetContentNetwork: boolean;
  targetPartnerSearchNetwork: boolean;
  targetYoutube: boolean;
  targetGoogleTvNetwork: boolean;
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
  ad: GoogleAdsAd;
  adStrength: GoogleAdsAdGroupAdAdStrength;
  actionItems: [string];
  labels: [string];
  adGroup: string;
}

export interface GoogleAdsAd {
  resourceName: string;
  type: GoogleAdsAdType;
}
