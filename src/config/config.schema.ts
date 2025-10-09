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
  GOOGLE_ADS_LOGIN_CUSTOMER_ID: z.string(),
  GOOGLE_ADS_REFRESH_TOKEN: z.string(),
});

export type AppConfig = z.infer<typeof configSchema>;
