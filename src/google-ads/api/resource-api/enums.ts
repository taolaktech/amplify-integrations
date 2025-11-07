/* Enums available here- https://developers.google.com/google-ads/api/rest/reference/rest/v20/AdGroup */

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

export enum GoogleCampaignContainsEuPoliticalAdvertising {
  UNSPECIFIED = 'UNSPECIFIED', // Not specified.
  UNKNOWN = 'UNKNOWN', // Value unknown in this version.
  CONTAINS_EU_POLITICAL_ADVERTISING = 'CONTAINS_EU_POLITICAL_ADVERTISING', // Campaign contains political advertising targeted towards the EU.
  DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING = 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING', // Campaign does not contain political advertising targeted towards the EU.
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

export enum GoogleAdsAdvertisingChannelType {
  SEARCH = 'SEARCH',
  PERFORMANCE_MAX = 'PERFORMANCE_MAX',
}

export enum GoogleAdsBiddingStrategyType {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  COMMISSION = 'COMMISSION',
  ENHANCED_CPC = 'ENHANCED_CPC',
  FIXED_CPM = 'FIXED_CPM',
  INVALID = 'INVALID',
  MANUAL_CPA = 'MANUAL_CPA',
  MANUAL_CPC = 'MANUAL_CPC',
  MANUAL_CPM = 'MANUAL_CPM',
  MANUAL_CPV = 'MANUAL_CPV',
  MAXIMIZE_CONVERSIONS = 'MAXIMIZE_CONVERSIONS',
  MAXIMIZE_CONVERSION_VALUE = 'MAXIMIZE_CONVERSION_VALUE',
  PAGE_ONE_PROMOTED = 'PAGE_ONE_PROMOTED',
  PERCENT_CPC = 'PERCENT_CPC',
  TARGET_CPA = 'TARGET_CPA',
  TARGET_CPM = 'TARGET_CPM',
  TARGET_CPV = 'TARGET_CPV',
  TARGET_IMPRESSION_SHARE = 'TARGET_IMPRESSION_SHARE',
  TARGET_OUTRANK_SHARE = 'TARGET_OUTRANK_SHARE',
  TARGET_ROAS = 'TARGET_ROAS',
  TARGET_SPEND = 'TARGET_SPEND',
}

export enum GoogleAdsBiddingStrategyStatus {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  ENABLED = 'ENABLED',
  REMOVED = 'REMOVED',
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

export enum GoogleAdsAssetType {
  UNSPECIFIED = 'UNSPECIFIED', // Not specified
  UNKNOWN = 'UNKNOWN', // Used for return value only, represents value unknown in this version
  YOUTUBE_VIDEO = 'YOUTUBE_VIDEO', // YouTube video asset
  MEDIA_BUNDLE = 'MEDIA_BUNDLE', // Media bundle asset
  IMAGE = 'IMAGE', // Image asset
  TEXT = 'TEXT', // Text asset
  LEAD_FORM = 'LEAD_FORM', // Lead form asset
  BOOK_ON_GOOGLE = 'BOOK_ON_GOOGLE', // Book on Google asset
  PROMOTION = 'PROMOTION', // Promotion asset
  CALLOUT = 'CALLOUT', // Callout asset
  STRUCTURED_SNIPPET = 'STRUCTURED_SNIPPET', // Structured Snippet asset
  SITELINK = 'SITELINK', // Sitelink asset
  PAGE_FEED = 'PAGE_FEED', // Page Feed asset
  DYNAMIC_EDUCATION = 'DYNAMIC_EDUCATION', // Dynamic Education asset
  MOBILE_APP = 'MOBILE_APP', // Mobile app asset
  HOTEL_CALLOUT = 'HOTEL_CALLOUT', // Hotel callout asset
  CALL = 'CALL', // Call asset
  PRICE = 'PRICE', // Price asset
  CALL_TO_ACTION = 'CALL_TO_ACTION', // Call to action asset
  DYNAMIC_REAL_ESTATE = 'DYNAMIC_REAL_ESTATE', // Dynamic real estate asset
  DYNAMIC_CUSTOM = 'DYNAMIC_CUSTOM', // Dynamic custom asset
  DYNAMIC_HOTELS_AND_RENTALS = 'DYNAMIC_HOTELS_AND_RENTALS', // Dynamic hotels and rentals asset
  DYNAMIC_FLIGHTS = 'DYNAMIC_FLIGHTS', // Dynamic flights asset
  DYNAMIC_TRAVEL = 'DYNAMIC_TRAVEL', // Dynamic travel asset
  DYNAMIC_LOCAL = 'DYNAMIC_LOCAL', // Dynamic local asset
  DYNAMIC_JOBS = 'DYNAMIC_JOBS', // Dynamic jobs asset
  LOCATION = 'LOCATION', // Location asset
  HOTEL_PROPERTY = 'HOTEL_PROPERTY', // Hotel property asset
  DEMAND_GEN_CAROUSEL_CARD = 'DEMAND_GEN_CAROUSEL_CARD', // Demand Gen Carousel Card asset
  BUSINESS_MESSAGE = 'BUSINESS_MESSAGE', // Business message asset
  APP_DEEP_LINK = 'APP_DEEP_LINK', // App deep link asset
  YOUTUBE_VIDEO_LIST = 'YOUTUBE_VIDEO_LIST', // YouTube video list asset
}

export enum GoogleAdsAssetSource {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  ADVERTISER = 'ADVERTISER',
  AUTOMATICALLY_CREATED = 'AUTOMATICALLY_CREATED',
}

export enum GoogleAdsServedAssetFieldType {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  HEADLINE_1 = 'HEADLINE_1',
  HEADLINE_2 = 'HEADLINE_2',
  HEADLINE_3 = 'HEADLINE_3',
  DESCRIPTION_1 = 'DESCRIPTION_1',
  DESCRIPTION_2 = 'DESCRIPTION_2',
  HEADLINE = 'HEADLINE',
  HEADLINE_IN_PORTRAIT = 'HEADLINE_IN_PORTRAIT',
  LONG_HEADLINE = 'LONG_HEADLINE',
  DESCRIPTION = 'DESCRIPTION',
  DESCRIPTION_IN_PORTRAIT = 'DESCRIPTION_IN_PORTRAIT',
  BUSINESS_NAME_IN_PORTRAIT = 'BUSINESS_NAME_IN_PORTRAIT',
  BUSINESS_NAME = 'BUSINESS_NAME',
  MARKETING_IMAGE = 'MARKETING_IMAGE',
  MARKETING_IMAGE_IN_PORTRAIT = 'MARKETING_IMAGE_IN_PORTRAIT',
  SQUARE_MARKETING_IMAGE = 'SQUARE_MARKETING_IMAGE',
  PORTRAIT_MARKETING_IMAGE = 'PORTRAIT_MARKETING_IMAGE',
  LOGO = 'LOGO',
  LANDSCAPE_LOGO = 'LANDSCAPE_LOGO',
  CALL_TO_ACTION = 'CALL_TO_ACTION',
  YOU_TUBE_VIDEO = 'YOU_TUBE_VIDEO',
  SITELINK = 'SITELINK',
  CALL = 'CALL',
  MOBILE_APP = 'MOBILE_APP',
  CALLOUT = 'CALLOUT',
  STRUCTURED_SNIPPET = 'STRUCTURED_SNIPPET',
  PRICE = 'PRICE',
  PROMOTION = 'PROMOTION',
  AD_IMAGE = 'AD_IMAGE',
  LEAD_FORM = 'LEAD_FORM',
  BUSINESS_LOGO = 'BUSINESS_LOGO',
}

export enum GoogleAdsAdGroupCriterionStatus {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  ENABLED = 'ENABLED',
  PAUSED = 'PAUSED',
  REMOVED = 'REMOVED',
}

export enum GoogleAdsKeywordMatchType {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  EXACT = 'EXACT',
  PHRASE = 'PHRASE',
  BROAD = 'BROAD',
}

export enum GoogleAdsCampaignCriterionStatus {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  ENABLED = 'ENABLED',
  PAUSED = 'PAUSED',
  REMOVED = 'REMOVED',
}

export enum GoogleAdsCriterionType {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  KEYWORD = 'KEYWORD',
  PLACEMENT = 'PLACEMENT',
  MOBILE_APP_CATEGORY = 'MOBILE_APP_CATEGORY',
  MOBILE_APPLICATION = 'MOBILE_APPLICATION',
  DEVICE = 'DEVICE',
  LOCATION = 'LOCATION',
  LISTING_GROUP = 'LISTING_GROUP',
  AD_SCHEDULE = 'AD_SCHEDULE',
  AGE_RANGE = 'AGE_RANGE',
  GENDER = 'GENDER',
  INCOME_RANGE = 'INCOME_RANGE',
  PARENTAL_STATUS = 'PARENTAL_STATUS',
  YOUTUBE_VIDEO = 'YOUTUBE_VIDEO',
  YOUTUBE_CHANNEL = 'YOUTUBE_CHANNEL',
  USER_LIST = 'USER_LIST',
  PROXIMITY = 'PROXIMITY',
  TOPIC = 'TOPIC',
  LISTING_SCOPE = 'LISTING_SCOPE',
  LANGUAGE = 'LANGUAGE',
  IP_BLOCK = 'IP_BLOCK',
  CONTENT_LABEL = 'CONTENT_LABEL',
  CARRIER = 'CARRIER',
  USER_INTEREST = 'USER_INTEREST',
  WEBPAGE = 'WEBPAGE',
  OPERATING_SYSTEM_VERSION = 'OPERATING_SYSTEM_VERSION',
  APP_PAYMENT_MODEL = 'APP_PAYMENT_MODEL',
  MOBILE_DEVICE = 'MOBILE_DEVICE',
  CUSTOM_AFFINITY = 'CUSTOM_AFFINITY',
  CUSTOM_INTENT = 'CUSTOM_INTENT',
  LOCATION_GROUP = 'LOCATION_GROUP',
  CUSTOM_AUDIENCE = 'CUSTOM_AUDIENCE',
  COMBINED_AUDIENCE = 'COMBINED_AUDIENCE',
  KEYWORD_THEME = 'KEYWORD_THEME',
  AUDIENCE = 'AUDIENCE',
  NEGATIVE_KEYWORD_LIST = 'NEGATIVE_KEYWORD_LIST',
  LOCAL_SERVICE_ID = 'LOCAL_SERVICE_ID',
  SEARCH_THEME = 'SEARCH_THEME',
  BRAND = 'BRAND',
  BRAND_LIST = 'BRAND_LIST',
  LIFE_EVENT = 'LIFE_EVENT',
  WEBPAGE_LIST = 'WEBPAGE_LIST',
}

export enum GeoTargetConstantStatus {
  UNSPECIFIED = 'UNSPECIFIED',
  UNKNOWN = 'UNKNOWN',
  ENABLED = 'ENABLED',
  REMOVAL_PLANNED = 'REMOVAL_PLANNED',
}

export enum ConversionActionType {
  UNSPECIFIED = 'UNSPECIFIED', // Not specified.
  UNKNOWN = 'UNKNOWN', // Used for return value only. Represents value unknown in this version.
  AD_CALL = 'AD_CALL', // Conversions that occur when a user clicks on an ad's call extension.
  CLICK_TO_CALL = 'CLICK_TO_CALL', // Conversions that occur when a user on a mobile device clicks a phone number.
  GOOGLE_PLAY_DOWNLOAD = 'GOOGLE_PLAY_DOWNLOAD', // Conversions that occur when a user downloads a mobile app from the Google Play Store.
  GOOGLE_PLAY_IN_APP_PURCHASE = 'GOOGLE_PLAY_IN_APP_PURCHASE', // Conversions that occur when a user makes a purchase in an app through Android billing.
  UPLOAD_CALLS = 'UPLOAD_CALLS', // Call conversions that are tracked by the advertiser and uploaded.
  UPLOAD_CLICKS = 'UPLOAD_CLICKS', // Conversions that are tracked by the advertiser and uploaded with attributed clicks.
  WEBPAGE = 'WEBPAGE', // Conversions that occur on a webpage.
  WEBSITE_CALL = 'WEBSITE_CALL', // Conversions that occur when a user calls a dynamically-generated phone number from an advertiser's website.
}

export enum ConversionActionStatus {
  UNSPECIFIED = 'UNSPECIFIED', // Not specified.
  UNKNOWN = 'UNKNOWN', // Used for return value only. Represents value unknown in this version.
  ENABLED = 'ENABLED', // Conversions will be recorded.
  REMOVED = 'REMOVED', // Conversions will not be recorded.
  HIDDEN = 'HIDDEN', // Conversions will not be recorded and the conversion action will not appear in the UI.
}

export enum GoogleAdsAssetFieldType {
  UNSPECIFIED = 'UNSPECIFIED', // Not specified
  UNKNOWN = 'UNKNOWN', // Value unknown in this version
  HEADLINE = 'HEADLINE', // Headline
  DESCRIPTION = 'DESCRIPTION', // Description
  MANDATORY_AD_TEXT = 'MANDATORY_AD_TEXT', // Mandatory ad text
  MARKETING_IMAGE = 'MARKETING_IMAGE', // Marketing image
  MEDIA_BUNDLE = 'MEDIA_BUNDLE', // Media bundle
  YOUTUBE_VIDEO = 'YOUTUBE_VIDEO', // YouTube video
  BOOK_ON_GOOGLE = 'BOOK_ON_GOOGLE', // Book on Google enabled (Hotels)
  LEAD_FORM = 'LEAD_FORM', // Lead Form extension
  PROMOTION = 'PROMOTION', // Promotion extension
  CALLOUT = 'CALLOUT', // Callout extension
  STRUCTURED_SNIPPET = 'STRUCTURED_SNIPPET', // Structured Snippet extension
  SITELINK = 'SITELINK', // Sitelink
  MOBILE_APP = 'MOBILE_APP', // Mobile App extension
  HOTEL_CALLOUT = 'HOTEL_CALLOUT', // Hotel Callout extension
  CALL = 'CALL', // Call extension
  PRICE = 'PRICE', // Price extension
  LONG_HEADLINE = 'LONG_HEADLINE', // Long headline
  BUSINESS_NAME = 'BUSINESS_NAME', // Business name
  SQUARE_MARKETING_IMAGE = 'SQUARE_MARKETING_IMAGE', // Square marketing image
  PORTRAIT_MARKETING_IMAGE = 'PORTRAIT_MARKETING_IMAGE', // Portrait marketing image
  LOGO = 'LOGO', // Logo
  LANDSCAPE_LOGO = 'LANDSCAPE_LOGO', // Landscape logo
  VIDEO = 'VIDEO', // Non-YouTube video
  CALL_TO_ACTION_SELECTION = 'CALL_TO_ACTION_SELECTION', // Call-to-action selection
  AD_IMAGE = 'AD_IMAGE', // Ad image
  BUSINESS_LOGO = 'BUSINESS_LOGO', // Business logo
  HOTEL_PROPERTY = 'HOTEL_PROPERTY', // Hotel property (Performance Max travel goals)
  DEMAND_GEN_CAROUSEL_CARD = 'DEMAND_GEN_CAROUSEL_CARD', // Demand Gen carousel card
  BUSINESS_MESSAGE = 'BUSINESS_MESSAGE', // Business Message
  TALL_PORTRAIT_MARKETING_IMAGE = 'TALL_PORTRAIT_MARKETING_IMAGE', // Tall portrait marketing image
  RELATED_YOUTUBE_VIDEOS = 'RELATED_YOUTUBE_VIDEOS', // Related YouTube videos
}

export type GoogleAdsAssetLinkPrimaryStatus =
  | 'UNSPECIFIED'
  | 'ELIGIBLE'
  | 'NOT_ELIGIBLE'
  | 'LIMITED'
  | 'UNKNOWN'
  | 'PAUSED'
  | 'REMOVED'
  | 'PENDING';
