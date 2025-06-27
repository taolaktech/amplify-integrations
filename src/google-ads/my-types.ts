import {
  GoogleAdsKeywordMatchType,
  GoogleAdsServedAssetFieldType,
} from './google-ads.enum';
export type CreateCampaignBody = {
  name: string;
  campaignBudget: string;
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
