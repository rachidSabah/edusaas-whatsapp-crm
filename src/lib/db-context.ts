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
  
  const dbUrl = env.TURSO_DATABASE_URL || 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
  const dbToken = env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';
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
    dbUrl: env.TURSO_DATABASE_URL || 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io',
    dbToken: env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA',
  };
}
