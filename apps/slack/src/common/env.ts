import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const zEnvInt = () => z.string().transform(Number).pipe(z.number().int());

export const env = createEnv({
  server: {
    CRON_SECRET: z.string(),
    // ELBA_API_BASE_URL: z.string().url(),
    // ELBA_SOURCE_ID: z.string(),
    // POSTGRES_HOST: z.string(),
    // POSTGRES_PORT: zEnvInt(),
    // POSTGRES_USER: z.string(),
    // POSTGRES_PASSWORD: z.string(),
    // POSTGRES_DATABASE: z.string(),
    POSTGRES_URL: z.string(),
    SLACK_SIGNING_SECRET: z.string(),
    REMOVE_ME_SLACK_OAUTH_TOKEN: z.string(),
  },
  experimental__runtimeEnv: {},
});

// export const dbEnv = createEnv({
//   server: {
//     ...dbVariables,
//   },
//   experimental__runtimeEnv: {},
// });
