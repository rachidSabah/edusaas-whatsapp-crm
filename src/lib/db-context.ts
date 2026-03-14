// Database context helper for Cloudflare Edge Runtime
// Provides unified access to database credentials and common operations

import { getRequestContext } from '@cloudflare/next-on-pages';
import { tursoExecute, tursoQuery, parseTursoResult, type CloudflareEnv } from './turso-http';

export interface DbContext {
  dbUrl: string;
  dbToken: string;
  jwtSecret: string;
  
  // Query helpers
  query: <T = Record<string, any>>(sql: string, args?: any[]) => Promise<T[]>;
  execute: (sql: string, args?: any[]) => Promise<void>;
}

/**
 * Get database context from Cloudflare environment
 */
export function getDbContext(): DbContext {
  const ctx = getRequestContext();
  const env = ctx.env as CloudflareEnv;
  
  const dbUrl = env.TURSO_DATABASE_URL;
  const dbToken = env.TURSO_AUTH_TOKEN;
  const jwtSecret = env.JWT_SECRET || 'edusaas-production-jwt-secret-super-secure-2024-key';
  
  if (!dbUrl || !dbToken) {
    throw new Error('Missing database configuration in Cloudflare environment');
  }
  
  return {
    dbUrl,
    dbToken,
    jwtSecret,
    
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
 * Get raw database credentials
 */
export function getDbCredentials(): { dbUrl: string; dbToken: string } {
  const ctx = getRequestContext();
  const env = ctx.env as CloudflareEnv;
  
  return {
    dbUrl: env.TURSO_DATABASE_URL,
    dbToken: env.TURSO_AUTH_TOKEN,
  };
}
