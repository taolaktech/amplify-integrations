import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { FacebookBusinessManagerService as FacebookMarketingApiService } from '../src/facebook/services/facebook-business-manager.service';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { FacebookCampaign } from '../src/database/schema/facebook-campaign.schema';
import TestAgent from 'supertest/lib/agent';

// --- 1. Mock the FacebookMarketingApiService ---
// This allows us to control its behavior without making real API calls.
const mockFacebookMarketingApiService = {
  createCampaign: jest.fn().mockResolvedValue({ id: 'mock_fb_campaign_123' }),
  createAdSet: jest.fn().mockResolvedValue({ id: 'mock_fb_adset_456' }),
  createFlexibleCreative: jest
    .fn()
    .mockResolvedValue({ id: 'mock_fb_creative_789' }),
  createAd: jest.fn().mockResolvedValue({ id: 'mock_fb_ad_101' }),
  updateStatus: jest.fn().mockResolvedValue({ success: true }),
};

// --- 2. Prepare Mock Data ---
// This simulates the data the Lambda fetches from Amplify-Manager.
const mockCampaignDataFromLambda = {
  campaignId: '65a5d6a8c4b1a8d4b3c9d7b1',
  userId: '680690b4b7fe560e4582cf2f',
  type: 'Test Product Launch',
  totalBudget: 300,
  platforms: ['FACEBOOK'],
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days
  location: [{ country: 'United States', state: 'CA', city: 'San Francisco' }],
  products: [
    {
      shopifyId: 'prod_1',
      title: 'Test Product 1',
      description: 'A great test product.',
      price: 19.99,
      productLink: 'https://example.com/product/1',
      creatives: [
        {
          channel: 'facebook',
          data: ['{"url":"https://example.com/image1.jpg"}'],
        },
      ],
    },
  ],
};

const mockUserAdAccountId = 'act_1234567890';

describe('Facebook Campaign E2E Flow', () => {
  let app: INestApplication;
  let httpAgent: TestAgent<request.Test>; //request.SuperTest<request.Test>;
  let facebookCampaignModel: Model<FacebookCampaign>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FacebookMarketingApiService) // <-- This is the key part
      .useValue(mockFacebookMarketingApiService) // <-- We replace the real service with our mock
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    httpAgent = request(app.getHttpServer());
    facebookCampaignModel = moduleFixture.get<Model<FacebookCampaign>>(
      getModelToken('FacebookCampaign'),
    );
  });

  // Clean up the database before each test
  beforeEach(async () => {
    await facebookCampaignModel.deleteMany({});
    // Reset mock function call counters before each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  // --- Test Scenarios will go here ---
  it('should complete the entire campaign creation flow successfully (Happy Path)', async () => {
    // === Step 1: Initialize Campaign ===
    const initResponse = await httpAgent
      .post('/facebook-campaigns/initialize')
      .send({
        campaignData: mockCampaignDataFromLambda,
        userAdAccountId: mockUserAdAccountId,
      })
      .expect(200);

    expect(initResponse.body.success).toBe(true);
    expect(initResponse.body.currentStep).toBe('INITIALIZED');
    expect(initResponse.body.nextStep).toBe('CREATE_ADSETS');
    expect(initResponse.body.data.facebookCampaignId).toBe(
      'mock_fb_campaign_123',
    );
    // Verify the mock was called correctly
    expect(mockFacebookMarketingApiService.createCampaign).toHaveBeenCalledWith(
      mockUserAdAccountId,
      expect.any(String),
    );

    // === Step 2: Create Ad Sets ===
    const adSetsResponse = await httpAgent
      .post(
        `/facebook-campaigns/${mockCampaignDataFromLambda.campaignId}/create-adsets`,
      )
      .expect(200);

    expect(adSetsResponse.body.success).toBe(true);
    expect(adSetsResponse.body.nextStep).toBe('CREATE_CREATIVES');
    expect(adSetsResponse.body.data.adSetIds[0]).toBe('mock_fb_adset_456');
    expect(mockFacebookMarketingApiService.createAdSet).toHaveBeenCalled();

    // === Step 3: Create Creatives ===
    const creativesResponse = await httpAgent
      .post(
        `/facebook-campaigns/${mockCampaignDataFromLambda.campaignId}/create-creatives`,
      )
      .expect(200);

    expect(creativesResponse.body.success).toBe(true);
    expect(creativesResponse.body.nextStep).toBe('CREATE_ADS');
    expect(creativesResponse.body.data.creativeIds[0]).toBe(
      'mock_fb_creative_789',
    );
    expect(
      mockFacebookMarketingApiService.createFlexibleCreative,
    ).toHaveBeenCalled();

    // === Step 4: Create Ads ===
    const adsResponse = await httpAgent
      .post(
        `/facebook-campaigns/${mockCampaignDataFromLambda.campaignId}/create-ads`,
      )
      .expect(200);

    expect(adsResponse.body.success).toBe(true);
    expect(adsResponse.body.nextStep).toBe('LAUNCH');
    expect(adsResponse.body.data.adIds[0]).toBe('mock_fb_ad_101');
    expect(mockFacebookMarketingApiService.createAd).toHaveBeenCalled();

    // === Step 5: Launch Campaign ===
    const launchResponse = await httpAgent
      .post(
        `/facebook-campaigns/${mockCampaignDataFromLambda.campaignId}/launch`,
      )
      .expect(200);

    expect(launchResponse.body.success).toBe(true);
    expect(launchResponse.body.currentStep).toBe('LAUNCHED');
    expect(launchResponse.body.nextStep).toBeNull();
    // Verify that all 3 components were activated
    expect(mockFacebookMarketingApiService.updateStatus).toHaveBeenCalledTimes(
      3,
    );

    // === Final Verification: Check the database state ===
    const finalDoc = await facebookCampaignModel.findOne({
      campaignId: mockCampaignDataFromLambda.campaignId,
    });
    expect(finalDoc?.processingStatus).toBe('LAUNCHED');
    expect(finalDoc?.facebookStatus).toBe('ACTIVE');
    expect(finalDoc?.adSets.length).toBe(1);
    expect(finalDoc?.ads.length).toBe(1);
    expect(finalDoc?.creatives.length).toBe(1);
  });

  // Add this inside the describe block
  it('should handle a failure and recover with the retry endpoint', async () => {
    // --- Setup: Make the Ad Set creation fail once, then succeed ---
    mockFacebookMarketingApiService.createAdSet
      .mockRejectedValueOnce(new Error('Facebook API is down'))
      .mockResolvedValueOnce({ id: 'mock_fb_adset_456_retry' });

    // --- Run the flow up to the point of failure ---
    // Step 1: Initialize (should succeed)
    await httpAgent
      .post('/facebook-campaigns/initialize')
      .send({
        campaignData: mockCampaignDataFromLambda,
        userAdAccountId: mockUserAdAccountId,
      })
      .expect(200);

    // Step 2: Create Ad Sets (this one should fail)
    await httpAgent
      .post(
        `/facebook-campaigns/${mockCampaignDataFromLambda.campaignId}/create-adsets`,
      )
      .expect(500); // Expect an Internal Server Error

    // --- Verify the Failed State ---
    const statusResponse = await httpAgent
      .get(
        `/facebook-campaigns/${mockCampaignDataFromLambda.campaignId}/status`,
      )
      .expect(200);

    expect(statusResponse.body.data.processingStatus).toBe('FAILED');
    expect(statusResponse.body.data.failedStep).toBe('CREATING_ADSETS');

    // --- Retry the Failed Step ---
    const retryResponse = await httpAgent
      .post(
        `/facebook-campaigns/${mockCampaignDataFromLambda.campaignId}/retry-step`,
      )
      .send({ step: 'CREATING_ADSETS' })
      .expect(200);

    expect(retryResponse.body.success).toBe(true);
    expect(retryResponse.body.currentStep).toBe('CREATING_ADSETS');
    expect(retryResponse.body.nextStep).toBe('CREATE_CREATIVES');
    expect(retryResponse.body.data.adSetIds[0]).toBe('mock_fb_adset_456_retry');

    // --- Verify Recovery ---
    // The createAdSet mock should now have been called twice (1 failure, 1 success)
    expect(mockFacebookMarketingApiService.createAdSet).toHaveBeenCalledTimes(
      2,
    );

    // Check the database to ensure status is now updated
    const recoveredDoc = await facebookCampaignModel.findOne({
      campaignId: mockCampaignDataFromLambda.campaignId,
    });
    expect(recoveredDoc?.processingStatus).toBe('ADSETS_CREATED');
    expect(recoveredDoc?.failedStep).toBeNull();
  });
});
