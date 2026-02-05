import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3334'),
  API_URL: z.string().url(),

  API_KEY: z.string(),

  INTERNAL_REQUEST_TOKEN: z.string(),

  OAUTH_STATE_SECRET: z.string(),

  SHOPIFY_CLIENT_ID: z.string(),
  SHOPIFY_CLIENT_SECRET: z.string(),

  JWT_SECRET: z.string(),

  CLIENT_URL: z.string().url(),

  //DB
  MONGO_URI: z.string(),
  DB_NAME: z.string(),

  // Google
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),

  // google ads
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string(),
  GOOGLE_ADS_REFRESH_TOKEN: z.string(),

  GOOGLE_ADS_REDIRECT_URL: z.string(),

  OPENAI_API_KEY: z.string(),
  OPENAI_BASE_URL: z.string().url().default('https://api.openai.com/v1'),

  // AWS/S3 (video asset storage)
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_REGION: z.string(),
  S3_BUCKET: z.string(),
});

export type AppConfig = z.infer<typeof configSchema>;
