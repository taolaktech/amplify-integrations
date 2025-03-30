import { z } from 'zod';

export const configSchema = z.object({
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('3333'),
  API_URL: z.string().url(),
});

export type AppConfig = z.infer<typeof configSchema>;
