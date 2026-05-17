import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  GATEWAY_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace']).default('info'),
});

export const config = schema.parse(process.env);
export type Config = z.infer<typeof schema>;
