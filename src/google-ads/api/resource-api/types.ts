/*
  Full resource definition here- https://developers.google.com/google-ads/api/rest/reference/rest
  Under v20 documentation.
*/
import {
  ConversionActionStatus,
  ConversionActionType,
  GeoTargetConstantStatus,
  GoogleAdsAdGroupAdAdStrength,
  GoogleAdsAdGroupAdStatus,
  GoogleAdsAdGroupCriterionStatus,
  GoogleAdsAdGroupStatus,
  GoogleAdsAdGroupType,
  GoogleAdsAdType,
  GoogleAdsAdvertisingChannelType,
  GoogleAdsAssetFieldType,
  GoogleAdsAssetLinkPrimaryStatus,
  GoogleAdsAssetSource,
  GoogleAdsAssetType,
  GoogleAdsBiddingStrategyStatus,
  GoogleAdsCampaignCriterionStatus,
  GoogleAdsCampaignStatus,
  GoogleAdsCriterionType,
  GoogleAdsKeywordMatchType,
  GoogleAdsResponseContentType,
  GoogleAdsServedAssetFieldType,
  GoogleCampaignContainsEuPoliticalAdvertising,
} from './enums';

export type GoogleTokensResult = {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
  id_token: string;
};

export type GoogleAdsResource =
  | 'campaignBudgets'
  | 'campaigns'
  | 'adGroups'
  | 'adGroupAds'
  | 'ads'
  | 'adGroupCriteria'
  | 'campaignCriteria'
  | 'conversionActions'
  | 'biddingStrategies'
  | 'assets'
  | 'customerAssets'
  | 'campaignAssets';

export interface ResourceCreationResponse {
  results: Result[] | undefined;
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
  totalAmountMicros: number;
  resourceName: string;
  explicitlyShared: boolean;
}

export interface GoogleAdsCampaign {
  id: string;
  resourceName: string;
  name: string;
  startDate: string;
  endDate: string;
  status: GoogleAdsCampaignStatus;
  campaignBudget: string;
  biddingStrategy: string;
  advertisingChannelType: GoogleAdsAdvertisingChannelType;
  manualCpc: Partial<{
    enhancedCpcEnabled: boolean;
  }>;
  targetCpa: {
    targetCpaMicros: number;
    cpcBidCeilingMicros: string;
    cpcBidFloorMicros: string;
  };
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
  containsEuPoliticalAdvertising: GoogleCampaignContainsEuPoliticalAdvertising;
}

export interface GoogleAdsBiddingStrategy {
  name: string;
  id: string;
  resourceName: string;
  status: GoogleAdsBiddingStrategyStatus;
  targetRoas: {
    targetRoas: number;
    cpcBidCeilingMicros: number;
    cpcBidFloorMicros: number;
  };
  targetCpa: {
    targetCpaMicros: number;
    cpcBidCeilingMicros: string;
    cpcBidFloorMicros: string;
  };
  maximizeConversions: {
    targetCpaMicros: number;
    cpcBidCeilingMicros: number;
    cpcBidFloorMicros: number;
  };
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
  ad: Partial<GoogleAdsAd>;
  adStrength: GoogleAdsAdGroupAdAdStrength;
  actionItems: [string];
  labels: [string];
  adGroup: string;
}

export interface GoogleAdsAd {
  resourceName: string;
  type: GoogleAdsAdType;
  finalUrls: string[];
  id: string;
  trackingUrlTemplate: string;
  finalUrlSuffix: string;
  displayUrl: string;
  addedByGoogleAds: boolean;
  name: string;
  responsiveSearchAd: Partial<{
    headlines: GoogleAdsAdTextAsset[];
    descriptions: GoogleAdsAdTextAsset[];
    path1: string;
    path2: string;
  }>;
}

export interface GoogleAdsAsset {
  resourceName: string;
  type: GoogleAdsAssetType;
  finalUrls: string[];
  finalMobileUrls: string[];
  textAsset: {
    text: string;
  };
  imageAsset: {
    data: string;
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
  type: GoogleAdsCriterionType;
  keyword: {
    matchType: GoogleAdsKeywordMatchType;
    text: string;
  };
}

export interface GoogleAdsCampaignCriterion {
  resourceName: string;
  displayName: string;
  campaign: string;
  criterionId: string;
  bidModifier: number;
  negative: boolean;
  type: GoogleAdsCriterionType;
  status: GoogleAdsCampaignCriterionStatus;
  location: {
    geoTargetConstant: string;
  };
}

export interface SuggestGeoTargetConstantsRequestBody {
  locale: string;
  countryCode: string;
  locationNames: {
    names: string[];
  };
  geoTargets?: {
    geoTargetConstants: string[];
  };
}

export interface SuggestGeoTargetConstantsResponse {
  geoTargetConstantSuggestions: GeoTargetConstantSuggestion[];
}

export interface GeoTargetConstantSuggestion {
  geoTargetConstant: GeoTargetConstant;
  geoTargetConstantParents: [GeoTargetConstant];
  locale: string;
  reach: string;
  searchTerm: string;
}

interface GeoTargetConstant {
  resourceName: string;
  status: GeoTargetConstantStatus;
  id: string;
  name: string;
  countryCode: string;
  targetType: string;
  canonicalName: string;
  parentGeoTarget: string;
}

export interface GoogleAdsConversionAction {
  resourceName: string;
  type: ConversionActionType;
  status: ConversionActionStatus;
  // "origin": enum (ConversionOrigin),
  // "category": enum (ConversionActionCategory),
  id: string;
  name: string;
  primaryForGoal: boolean;
  ownerCustomer: string;
  includeInConversionsMetric: boolean;
  clickThroughLookbackWindowDays: string;
  viewThroughLookbackWindowDays: string;
  phoneCallDurationSeconds: string;
  appId: string;
  // "valueSettings": {
  //   object (ValueSettings)
  // },
  // "countingType": enum (ConversionActionCountingType),
  // "attributionModelSettings": {
  //   object (AttributionModelSettings)
  // },
  // "tagSnippets": [
  //   {
  //     object (TagSnippet)
  //   }
  // ],
  // "mobileAppVendor": enum (MobileAppVendor),
  // "firebaseSettings": {
  //   object (FirebaseSettings)
  // },
  // "thirdPartyAppAnalyticsSettings": {
  //   object (ThirdPartyAppAnalyticsSettings)
  // },
  // "googleAnalytics4Settings": {
  //   object (GoogleAnalytics4Settings)
  // },
}

export type GoogleAdsCustomerAsset = {
  resourceName: string; // customers/{customer_id}/customerAssets/{asset_id}~{field_type}

  asset: string; // resource name of the asset linked to the customer

  fieldType: GoogleAdsAssetFieldType; // role that the asset takes

  source?: 'UNSPECIFIED' | 'ADVERTISER' | 'AUTOMATICALLY_CREATED' | 'UNKNOWN'; // output only

  status: 'ENABLED' | 'PAUSED' | 'REMOVED'; // enabled, paused, removed

  primaryStatus?: GoogleAdsAssetLinkPrimaryStatus; // output only, serving state

  primaryStatusDetails?: string[]; // output only

  primaryStatusReasons?: string[]; // output only
};

export type GoogleAdsCampaignAsset = {
  resourceName: string; // customers/{customer_id}/customerAssets/{asset_id}~{field_type}

  asset: string; // resource name of the asset linked to the customer

  fieldType: GoogleAdsAssetFieldType; // role that the asset takes

  source?: 'UNSPECIFIED' | 'ADVERTISER' | 'AUTOMATICALLY_CREATED' | 'UNKNOWN'; // output only

  status: 'ENABLED' | 'PAUSED' | 'REMOVED'; // enabled, paused, removed

  primaryStatus?: GoogleAdsAssetLinkPrimaryStatus; // output only, serving state

  primaryStatusDetails?: string[]; // output only

  primaryStatusReasons?: string[]; // output only

  campaign: string;
};
