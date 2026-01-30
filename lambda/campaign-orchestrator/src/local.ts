import * as dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'AMPLIFY_MANAGER_API_URL',
  'AMPLIFY_INTEGRATIONS_API_URL',
  'INTERNAL_API_KEY',
];

const missingEnvVars = requiredEnvVars.filter((k) => !process.env[k]);
if (missingEnvVars.length) {
  throw new Error(
    `Missing required env vars for local run: ${missingEnvVars.join(', ')}`,
  );
}

async function run() {
  const { main } = await import('./facebook');
  await main(
    {
      Records: [
        {
          messageId: 'local',
          receiptHandle: 'local',
          body: JSON.stringify({
            campaignId: '695e93c343b60e1b0d7bfbce',
          }),
          attributes: {
            ApproximateReceiveCount: '1',
            SentTimestamp: `${Date.now()}`,
            SenderId: 'local',
            ApproximateFirstReceiveTimestamp: `${Date.now()}`,
          },
          messageAttributes: {},
          md5OfBody: '',
          eventSource: 'aws:sqs',
          eventSourceARN: 'arn:aws:sqs:local:000000000000:local',
          awsRegion: 'local',
        },
      ],
    } as any,
    {} as any,
    (() => undefined) as any,
  );
}

run();
