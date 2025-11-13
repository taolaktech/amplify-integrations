import { SQSEvent, SQSHandler } from 'aws-lambda';
import axios from 'axios';

// --- Configuration ---
const MANAGER_API_URL = process.env.AMPLIFY_MANAGER_API_URL;
const INTEGRATIONS_API_URL = process.env.AMPLIFY_INTEGRATIONS_API_URL;
const API_KEY = process.env.INTERNAL_API_KEY;

// --- HTTP Clients ---
const managerApi = axios.create({
  baseURL: MANAGER_API_URL,
  headers: { 'x-api-key': API_KEY },
});

const integrationsApi = axios.create({
  baseURL: INTEGRATIONS_API_URL,
  headers: { 'X-Internal-API-Key': API_KEY },
});

interface CampaignData {
  __v: string;
  _id: string;
  createdBy: string;
  status: string;
  businessId: string;
  type: string;
  brandColor: string;
  accentColor: string;
  tone: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  platforms: string[];
  location: Array<{
    country: string;
    city: string;
    state: string;
  }>;
  products: Array<{
    shopifyId: string;
    title: string;
    price: number;
    description: string;
    audience?: string;
    occasion?: string;
    features: string[];
    category: string;
    imageLink: string;
    productLink: string;
    creatives: Array<{
      id: string;
      channel: string;
      budget: number;
      data: string[];
    }>;
  }>;
}

// --- Type Definitions ---
interface CampaignDataRequest {
  campaignId: string;
  pageId: string;
  metaPixelId: string;
  userId: string;
  businessId: string;
  type: string;
  brandColor: string;
  accentColor: string;
  tone: string;
  startDate: string;
  endDate: string;
  totalBudget: number;
  platforms: string[];
  location: Array<{
    country: string;
    city: string;
    state: string;
  }>;
  products: Array<{
    shopifyId: string;
    title: string;
    price: number;
    description: string;
    audience?: string;
    occasion?: string;
    features: string[];
    category: string;
    imageLink: string;
    productLink: string;
    creatives: Array<{
      id: string;
      channel: string;
      budget: number;
      data: string[];
    }>;
  }>;
}

interface CampaignDataResponse {
  data: CampaignData;
  message: string;
  success: boolean;
}

interface AdAccountData {
  accountId: string;
  pageId: string;
  metaPixelId: string;
  name: string;
  currency: string;
  integrationStatus: string;
}

interface AdAccountDataResponse {
  sucees: boolean;
  data: AdAccountData;
}

interface SqsBody {
  campaignId: string;
  step?: string;
}

interface StepResponse {
  success: boolean;
  nextStep?: string | null;
  message: string;
  data?: any;
}

// --- API Helper Functions ---

async function getCampaignData(campaignId: string): Promise<CampaignData> {
  console.log(`Fetching campaign data for campaignId: ${campaignId}`);
  const response = await managerApi.get<CampaignDataResponse>(
    `/internal/campaign/${campaignId}`,
  );
  console.log(`::: Response => ${JSON.stringify(response.data)}`);
  return response.data.data;
}

async function getAdAccount(userId: string): Promise<AdAccountData> {
  console.log(`Fetching ad account for userId: ${userId}`);
  const response = await integrationsApi.get<AdAccountDataResponse>(
    `/facebook/internal/users/${userId}/primary-ad-account`,
  );
  return response.data.data;
}

async function callInitializeStep(payload: {
  campaignData: CampaignDataRequest;
  userAdAccountId: string;
}): Promise<StepResponse> {
  console.log('Executing STEP: INITIALIZE');
  const response = await integrationsApi.post(
    '/facebook-campaigns/initialize',
    payload,
  );
  console.log('STEP "INITIALIZE" successful.');
  return response.data;
}

async function callCreateAdsetsStep(campaignId: string): Promise<StepResponse> {
  console.log('Executing STEP: CREATE_ADSETS');
  const response = await integrationsApi.post(
    `/facebook-campaigns/${campaignId}/create-adsets`,
  );
  console.log('STEP "CREATE_ADSETS" successful.');
  return response.data;
}

async function callCreateCreativesStep(
  campaignId: string,
): Promise<StepResponse> {
  console.log('Executing STEP: CREATE_CREATIVES');
  const response = await integrationsApi.post(
    `/facebook-campaigns/${campaignId}/create-creatives`,
  );
  console.log('STEP "CREATE_CREATIVES" successful.');
  return response.data;
}

async function callCreateAdsStep(campaignId: string): Promise<StepResponse> {
  console.log('Executing STEP: CREATE_ADS');
  const response = await integrationsApi.post(
    `/facebook-campaigns/${campaignId}/create-ads`,
  );
  console.log('STEP "CREATE_ADS" successful.');
  return response.data;
}

async function callLaunchStep(campaignId: string): Promise<StepResponse> {
  console.log('Executing STEP: LAUNCH');
  const response = await integrationsApi.post(
    `/facebook-campaigns/${campaignId}/launch`,
  );
  console.log('STEP "LAUNCH" successful. Workflow complete.');
  return response.data;
}

// --- Lambda Handler ---

export const main: SQSHandler = async (event: SQSEvent): Promise<void> => {
  console.log('Received SQS event with records:', event.Records.length);

  for (const record of event.Records) {
    let campaignId: string | null = null;
    try {
      console.log('Processing message:', record.messageId);
      const body: SqsBody = JSON.parse(record.body);
      campaignId = body.campaignId; // Assign campaignId for logging in catch block

      if (!campaignId) {
        throw new Error('Message is missing required "campaignId" field.');
      }

      if (body.step) {
        console.log(
          `This worker only handles initial triggers. Ignoring message for step: ${body.step}.`,
        );
        return;
      }

      // 1. Gather initial data
      const campaignData = await getCampaignData(campaignId);
      if (Object.keys(campaignData).length < 1) {
        throw new Error(
          `Campaign data not found for campaignId: ${campaignId}`,
        );
      }
      const adAccountData = await getAdAccount(campaignData.createdBy);

      if (Object.keys(adAccountData).length < 1) {
        throw new Error('User has no ad account');
      }

      const {
        _id,
        createdBy,
        status,
        createdAt,
        updatedAt,
        __v,
        platforms,
        ...rest
      } = campaignData;

      // strip out other values from platforms leaving only facebook
      // let platformWithFacebookOnly = [];

      const initializePayload = {
        campaignData: {
          ...rest,
          platforms: ['FACEBOOK'],
          // set a random name on property type on each run
          type: `Market Launch`,
          campaignId: _id,
          userId: createdBy,
          pageId: adAccountData.pageId,
          metaPixelId: adAccountData.metaPixelId,
        },
        userAdAccountId: adAccountData.accountId,
      };

      // 2. Begin Sequential Step Execution
      console.log('Beginning sequential step execution...');
      console.log(
        `Initializing campaign with the following request body => ${JSON.stringify(initializePayload, null, 2)}`,
      );
      await callInitializeStep(initializePayload);
      await callCreateAdsetsStep(campaignId);
      await callCreateCreativesStep(campaignId);
      await callCreateAdsStep(campaignId);
      await callLaunchStep(campaignId);

      console.log(
        `Successfully completed all steps for campaign ${campaignId}.`,
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(
        `Error processing campaign ${campaignId || record.messageId}:`,
        errorMessage,
      );
      console.error(
        'Full error object:',
        JSON.stringify(error.response?.data || error, null, 2),
      );

      throw error;
    }
  }
};
