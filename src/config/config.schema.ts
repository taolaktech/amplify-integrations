import { z } from 'zod';

export const configSchema = z.object({
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
});

export type AppConfig = z.infer<typeof configSchema>;
