// Database context helper for Cloudflare Edge Runtime
// Provides unified access to database credentials and common operations

import { getRequestContext } from '@cloudflare/next-on-pages';
import { tursoExecute, tursoQuery, parseTursoResult, getDbCredentials as getFallbackCredentials, getJwtSecret, type CloudflareEnv } from './turso-http';

export interface DbContext {
  dbUrl: string;
  dbToken: string;
  jwtSecret: string;
  
  // Query helpers
  query: <T = Record<string, any>>(sql: string, args?: any[]) => Promise<T[]>;
  execute: (sql: string, args?: any[]) => Promise<void>;
}

/**
 * Get database context from Cloudflare environment with fallback support
 */
export function getDbContext(): DbContext {
  let env: CloudflareEnv | null = null;
  
nst jwtSecret = getJwtSecret(env);
  
  return {
    dbUrl,
    dbToken,
S   
    // Query helper that returns parsed results
    query: async <T = Record<string, any>>(sql: string, args: any[] = []): Promise<T[]> => {
      return tursoQuery<T>(dbUrl, dbToken, sql, args);
    },
    
    // Execute helper for INSERT/UPDATE/DELETE
    execute: async (sql: string, args: any[] = []): Promise<void> => {
      await tursoExecute(dbUrl, dbToken, sql, args);
    },
  };
}

/**
 * Get raw database credentials with fallback support
 */
export function getDbCredentials(): { dbUrl: string; dbToken: string } {
  let env: CloudflareEnv | null = null;
  
  try {
    const ctx = getRequestContext();
    env = ctx.env as CloudflareEnv;
  } catch {
    // Not in Cloudflare context
  }
  
  const { url, token } = getFallbackCredentials(env);
  
  return {
    dbUrl: url,
    dbToken: token,
  };
}
