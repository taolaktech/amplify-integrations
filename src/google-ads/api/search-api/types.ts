export interface GetBatchGoogleCampaignMetricsResponse {
  results: Result[];
  fieldMask: string;
  requestId: string;
  queryResourceConsumption: string;
}

interface Result {
  campaign: Campaign;
  metrics: Metrics;
}

interface Campaign {
  resourceName: string;
  status: string;
  name: string;
  id: string;
}

interface Metrics {
  clicks: string;
  conversionsValue: number;
  conversions: number;
  costMicros: string;
  impressions: string;
}
