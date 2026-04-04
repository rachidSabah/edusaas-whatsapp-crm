// Database Client for Cloudflare Pages with D1
// This module provides database operations using Cloudflare D1

import { getRequestContext } from '@cloudflare/next-on-pages';

export interface DbResult<T = unknown> {
  results: T[];
  success: boolean;
  error?: string;
  meta?: {
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}

export interface DbContext {
  query: <T = Record<string, unknown>>(sql: string, args?: unknown[]) => Promise<T[]>;
  execute: (sql: string, args?: unknown[]) => Promise<DbResult>;
  batch: (statements: { sql: string; args?: unknown[] }[]) => Promise<DbResult[]>;
}

/**
 * Get D1 database from Cloudflare context
 */
function getD1Database(): D1Database {
  try {
    const ctx = getRequestContext();
    const env = ctx.env as { DB?: D1Database };
    
    if (!env.DB) {
      throw new Error('D1 database binding "DB" not found. Make sure wrangler.toml has [[d1_databases]] configured.');
    }
    
    return env.DB;
  } catch (error) {
    console.error('[D1] Failed to get D1 database:', error);
    throw new Error('Failed to get D1 database. Ensure you are running on Cloudflare Pages with D1 configured.');
  }
}

/**
 * Get database context - Uses D1 on Cloudflare Pages
 */
export function getDbContext(): DbContext {
  return {
    query: async <T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T[]> => {
      const db = getD1Database();
      console.log(`[D1 Query] ${sql.substring(0, 100)}...`);
      console.log(`[D1 Args]`, args);
      
      try {
        const stmt = db.prepare(sql);
        const result = await stmt.bind(...args).all<T>();
        console.log(`[D1 Result] ${result.results?.length || 0} rows`);
        return result.results || [];
      } catch (error) {
        console.error('[D1 Query Error]:', error);
        throw error;
      }
    },
    
    execute: async (sql: string, args: unknown[] = []): Promise<DbResult> => {
      const db = getD1Database();
      console.log(`[D1 Execute] ${sql.substring(0, 100)}...`);
      console.log(`[D1 Args]`, args);
      
      try {
        const stmt = db.prepare(sql);
        const result = await stmt.bind(...args).run();
        console.log(`[D1 Execute Result] Success: ${result.success}, Changes: ${result.meta?.changes || 0}`);
        return result;
      } catch (error) {
        console.error('[D1 Execute Error]:', error);
        throw error;
      }
    },
    
    batch: async (statements: { sql: string; args?: unknown[] }[]): Promise<DbResult[]> => {
      const db = getD1Database();
      console.log(`[D1 Batch] Executing ${statements.length} statements`);
      
      try {
        const stmts = statements.map(s => {
          const stmt = db.prepare(s.sql);
          return s.args && s.args.length > 0 ? stmt.bind(...s.args) : stmt;
        });
        const results = await db.batch(stmts);
        console.log(`[D1 Batch] Completed ${results.length} statements`);
        return results;
      } catch (error) {
        console.error('[D1 Batch Error]:', error);
        throw error;
      }
    },
  };
}

/**
 * Get a single row from a query
 */
export async function getOne<T = Record<string, unknown>>(
  sql: string, 
  args: unknown[] = []
): Promise<T | null> {
  const db = getD1Database();
  
  try {
    const stmt = db.prepare(sql);
    const result = await stmt.bind(...args).first<T>();
    return result || null;
  } catch (error) {
    console.error('[D1 GetOne Error]:', error);
    throw error;
  }
}

/**
 * Execute a query and return results directly (shorthand)
 */
export async function query<T = Record<string, unknown>>(
  sql: string, 
  args: unknown[] = []
): Promise<T[]> {
  return getDbContext().query<T>(sql, args);
}

/**
 * Execute an INSERT/UPDATE/DELETE statement directly (shorthand)
 */
export async function execute(
  sql: string, 
  args: unknown[] = []
): Promise<DbResult> {
  return getDbContext().execute(sql, args);
}

// Type declarations for D1Database (Cloudflare Workers types)
declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<DbResult<T>[]>;
    exec(query: string): Promise<D1ExecResult>;
    dump(): Promise<ArrayBuffer>;
  }
  
  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    all<T = unknown>(): Promise<DbResult<T>>;
    run(): Promise<DbResult>;
    raw<T = unknown>(): Promise<T[]>;
  }
  
  interface D1ExecResult {
    count: number;
    duration: number;
  }
}
