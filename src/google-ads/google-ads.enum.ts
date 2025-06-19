/* Enums available here- https://developers.google.com/google-ads/api/rest/reference/rest/v20/AdGroup */

export enum GoogleAdsAccount {
  AMPLIFY_US = 'amplify_us',
  AMPLIFY_CA = 'amplify_ca',
}

export enum GoogleAdsResponseContentType {
  UNSPECIFIED = 'UNSPECIFIED',
  RESOURCE_NAME_ONLY = 'RESOURCE_NAME_ONLY',
  MUTABLE_RESOURCE = 'MUTABLE_RESOURCE',
}

export enum GoogleAdsCampaignStatus {
  UNSPECIFIED = 'UNSPECIFIED',
  ENABLED = 'ENABLED',
  PAUSED = 'PAUSED',
  REMOVED = 'REMOVED',
  UNKNOWN = 'UNKNOWN',
}

export enum GoogleAdsCampaignServingStatus {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  SERVING = 'SERVING',
  NONE = 'NONE',
  ENDED = 'ENDED',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

export enum GoogleAdsAdGroupStatus {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  ENABLED = 'ENABLED',
  PAUSED = 'PAUSED',
  REMOVED = 'REMOVED',
}

export enum GoogleAdsAdGroupType {
  SEARCH_STANDARD = 'SEARCH_STANDARD',
  SEARCH_DYNAMIC_ADS = 'SEARCH_DYNAMIC_ADS',
}

export enum GoogleAdsAdGroupAdStatus {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  ENABLED = 'ENABLED',
  PAUSED = 'PAUSED',
  REMOVED = 'REMOVED',
}

export enum GoogleAdsAdGroupAdAdStrength {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  PENDING = 'PENDING',
  NO_ADS = 'NO_ADS',
  POOR = 'POOR',
  AVERAGE = 'AVERAGE',
  GOOD = 'GOOD',
  EXCELLENT = 'EXCELLENT',
}

export enum GoogleAdsAdType {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  TEXT_AD = 'TEXT_AD',
  EXPANDED_TEXT_AD = 'EXPANDED_TEXT_AD',
  EXPANDED_DYNAMIC_SEARCH_AD = 'EXPANDED_DYNAMIC_SEARCH_AD',
  RESPONSIVE_SEARCH_AD = 'RESPONSIVE_SEARCH_AD',
}

export enum GoogleAdsAdvertisingChannelType {
  SEARCH = 'SEARCH',
}
