import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from './schema';
import { neonConfig } from '@neondatabase/serverless';

// To have an local like neon database environment as vercel postgres use neon
// see: https://gal.hagever.com/posts/running-vercel-postgres-locally
if (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === 'development') {
  // Set the WebSocket proxy to work with the local instance
  neonConfig.wsProxy = (host) => `${host}:5433/v1`;
  // Disable all authentication and encryption
  neonConfig.useSecureWebSocket = false;
  neonConfig.pipelineTLS = false;
  neonConfig.pipelineConnect = false;
}

export const db = drizzle(sql, { schema });
