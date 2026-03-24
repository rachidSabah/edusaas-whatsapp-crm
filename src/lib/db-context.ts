// Database context helper for Cloudflare Edge Runtime
// Provides unified access to database credentials and common operations

import { getRequestContext } from '@cloudflare/next-on-pages';
import { tursoExecute, tursoQuery, parseTursoResult, getDbCredentials as getFallbackCredentials, getJwtSecret, tursoExecuteWithVerify, type CloudflareEnv } from './turso-http';

export interface DbContext {
  dbUrl: string;
  dbToken: string;
  jwtSecret: string;
  
  // Query helpers
  query: <T = Record<string, any>>(sql: string, args?: any[]) => Promise<T[]>;
  execute: (sql: string, args?: any[]) => Promise<void>;
  executeWithVerify: <T = Record<string, any>>(sql: string, args: any[], verifySql: string, verifyArgs?: any[]) => Promise<{ success: boolean; data?: T[] }>;
}

/**
 * Get database context from Cloudflare environment with fallback support
 */
export function getDbContext(): DbContext {
  let env: CloudflareEnv | null = null;
  
  try {
    const ctx = getRequestContext();
    env = ctx.env as CloudflareEnv;
  } catch {
    // Not in Cloudflare context
  }
  
  const { url: dbUrl, token: dbToken } = getFallbackCredentials(env);
  const jwtSecret = getJwtSecret(env);
  
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
    
    // Execute with verification for critical writes
    executeWithVerify: async <T = Record<string, any>>(
      sql: string, 
      args: any[], 
      verifySql: string, 
      verifyArgs: any[] = []
    ): Promise<{ success: boolean; data?: T[] }> => {
      return tursoExecuteWithVerify<T>(dbUrl, dbToken, sql, args, verifySql, verifyArgs);
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
