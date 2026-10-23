import { z } from 'zod';
export const CONFIG = Symbol('CONFIG');
const schema = z.object({
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
  SESSION_SECRET: z.string().min(32),
  APP_ORIGIN: z.url().default('http://localhost:5176'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3200),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});
export type Config = z.infer<typeof schema>;
export function loadConfig(): Config {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    throw new Error(
      'Invalid configuration fields: ' +
        result.error.issues.map((issue) => issue.path.join('.')).join(', '),
    );
  }
  return result.data;
}
