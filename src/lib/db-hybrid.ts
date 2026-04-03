// Hybrid Database Client for Cloudflare Pages + Turso
// This module provides a unified database interface that:
// 1. Uses D1 when available (Cloudflare Pages with D1 binding)
// 2. Falls back to Turso HTTP when D1 isn't available

import { createClient, type Client } from '@libsql/client/web';

// Turso credentials (used as fallback)
const DEFAULT_TURSO_URL = 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
const DEFAULT_TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';

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
  query: <T = Record<string, unknown>>(sql: string, ...args: unknown[]) => Promise<T[]>;
  execute: (sql: string, ...args: unknown[]) => Promise<DbResult>;
  batch: (statements: { sql: string; args?: unknown[] }[]) => Promise<DbResult[]>;
}

// Check if we're in Cloudflare Pages with D1 binding
function hasD1Binding(): boolean {
  try {
    // Dynamic import to avoid errors in non-Cloudflare environments
    const { getRequestContext } = require('@cloudflare/next-on-pages');
    const ctx = getRequestContext();
    const env = ctx.env as { DB?: unknown };
    return !!env.DB;
  } catch {
    return false;
  }
}

// Get D1 database (only works in Cloudflare Pages)
function getD1Database(): unknown {
  try {
    const { getRequestContext } = require('@cloudflare/next-on-pages');
    const ctx = getRequestContext();
    const env = ctx.env as { DB: unknown };
    return env.DB;
  } catch {
    return null;
  }
}

// Create Turso client
function createTursoClient(): Client {
  const url = DEFAULT_TURSO_URL.startsWith('libsql://') 
    ? DEFAULT_TURSO_URL.replace('libsql://', 'https://')
    : DEFAULT_TURSO_URL;
  
  return createClient({
    url,
    authToken: DEFAULT_TURSO_TOKEN,
  });
}

// Convert Turso result to D1-like format
function convertTursoResult<T>(result: { rows: T[] }): DbResult<T> {
  return {
    results: result.rows,
    success: true,
    meta: {
      changes: 0,
      last_row_id: 0,
      rows_read: result.rows.length,
      rows_written: 0,
    },
  };
}

// Convert Turso execute result to D1-like format
function convertTursoExecResult(result: { rowsAffected?: number; lastInsertRowid?: number | string }): DbResult {
  return {
    results: [],
    success: true,
    meta: {
      changes: result.rowsAffected || 0,
      last_row_id: typeof result.lastInsertRowid === 'string' 
        ? parseInt(result.lastInsertRowid, 10) 
        : (result.lastInsertRowid || 0),
      rows_read: 0,
      rows_written: result.rowsAffected || 0,
    },
  };
}

/**
 * Get database context - Works with both D1 and Turso
 * This is the main function to use for database operations
 */
export function getDbContext(): DbContext {
  const useD1 = hasD1Binding();
  console.log(`[DB] Using ${useD1 ? 'D1' : 'Turso'} database`);
  
  if (useD1) {
    // D1 implementation
    return {
      query: async <T = Record<string, unknown>>(sql: string, ...args: unknown[]): Promise<T[]> => {
        const db = getD1Database() as D1Database;
        console.log(`[D1 Query] ${sql.substring(0, 100)}...`);
        
        const stmt = db.prepare(sql);
        const result = await stmt.bind(...args).all<T>();
        return result.results || [];
      },
      
      execute: async (sql: string, ...args: unknown[]): Promise<DbResult> => {
        const db = getD1Database() as D1Database;
        console.log(`[D1 Execute] ${sql.substring(0, 100)}...`);
        
        const stmt = db.prepare(sql);
        const result = await stmt.bind(...args).run();
        return result;
      },
      
      batch: async (statements: { sql: string; args?: unknown[] }[]): Promise<DbResult[]> => {
        const db = getD1Database() as D1Database;
        const stmts = statements.map(s => {
          const stmt = db.prepare(s.sql);
          return s.args && s.args.length > 0 ? stmt.bind(...s.args) : stmt;
        });
        return db.batch(stmts);
      },
    };
  } else {
    // Turso HTTP implementation
    const turso = createTursoClient();
    
    return {
      query: async <T = Record<string, unknown>>(sql: string, ...args: unknown[]): Promise<T[]> => {
        console.log(`[Turso Query] ${sql.substring(0, 100)}...`);
        
        const result = await turso.execute({
          sql,
          args: args as Record<string, unknown>[],
        });
        
        return result.rows as T[];
      },
      
      execute: async (sql: string, ...args: unknown[]): Promise<DbResult> => {
        console.log(`[Turso Execute] ${sql.substring(0, 100)}...`);
        
        const result = await turso.execute({
          sql,
          args: args as Record<string, unknown>[],
        });
        
        return convertTursoExecResult(result);
      },
      
      batch: async (statements: { sql: string; args?: unknown[] }[]): Promise<DbResult[]> => {
        const results: DbResult[] = [];
        for (const stmt of statements) {
          const result = await turso.execute({
            sql: stmt.sql,
            args: stmt.args as Record<string, unknown>[],
          });
          results.push(convertTursoExecResult(result));
        }
        return results;
      },
    };
  }
}

/**
 * Get a single row from a query
 */
export async function getOne<T = Record<string, unknown>>(
  sql: string, 
  ...args: unknown[]
): Promise<T | null> {
  const useD1 = hasD1Binding();
  
  if (useD1) {
    const db = getD1Database() as D1Database;
    const stmt = db.prepare(sql);
    const result = await stmt.bind(...args).first<T>();
    return result || null;
  } else {
    const turso = createTursoClient();
    const result = await turso.execute({
      sql,
      args: args as Record<string, unknown>[],
    });
    return (result.rows[0] as T) || null;
  }
}

/**
 * Execute a query and return results directly (shorthand)
 */
export async function query<T = Record<string, unknown>>(
  sql: string, 
  ...args: unknown[]
): Promise<T[]> {
  return getDbContext().query<T>(sql, ...args);
}

/**
 * Execute an INSERT/UPDATE/DELETE statement directly (shorthand)
 */
export async function execute(
  sql: string, 
  ...args: unknown[]
): Promise<DbResult> {
  return getDbContext().execute(sql, ...args);
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
