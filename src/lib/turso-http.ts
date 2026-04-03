// Turso HTTP Client for Cloudflare Edge Runtime
// This module provides a simple HTTP-based Turso client that works with Cloudflare Workers

import { getRequestContext } from '@cloudflare/next-on-pages';

// Default Turso credentials (used as fallback when env vars are not available)
const DEFAULT_TURSO_URL = 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
const DEFAULT_TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';
const DEFAULT_JWT_SECRET = 'edusaas-production-jwt-secret-super-secure-2024-key';

// Environment variables for Turso database connection
// Set these in Cloudflare Dashboard → Pages → Your Project → Settings → Environment variables
// Required: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN

export interface CloudflareEnv {
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  JWT_SECRET?: string;
  [key: string]: string;
}

interface TursoCell {
  type: 'null' | 'integer' | 'float' | 'text' | 'blob';
  value?: string | number | null;
}

interface TursoResult {
  results: Array<{
    response: {
      result: {
        cols: Array<{ name: string }>;
        rows: TursoCell[][];
      };
    };
  }>;
}

/**
 * Get database credentials from Cloudflare environment
 * This function accesses environment variables set in Cloudflare Pages
 */
export function getDbCredentials(env?: CloudflareEnv | null): { url: string; token: string } {
  let url: string | undefined;
  let token: string | undefined;
  
  // Debug: Log all available env sources
  console.log('[getDbCredentials] === Starting credential lookup ===');
  
  // Method 1: Try passed env parameter
  if (env) {
    console.log('[getDbCredentials] Checking passed env parameter...');
    url = env.TURSO_DATABASE_URL;
    token = env.TURSO_AUTH_TOKEN;
    console.log(`  - TURSO_DATABASE_URL: ${url ? 'Found' : 'Not found'}`);
    console.log(`  - TURSO_AUTH_TOKEN: ${token ? 'Found' : 'Not found'}`);
  }
  
  // Method 2: Try Cloudflare Pages bindings via getRequestContext
  if (!url || !token) {
    try {
      const ctx = getRequestContext();
      const cfEnv = ctx.env as CloudflareEnv;
      console.log('[getDbCredentials] Checking Cloudflare context...');
      console.log(`  - Available keys: ${Object.keys(cfEnv || {}).join(', ')}`);
      
      if (cfEnv) {
        if (!url && cfEnv.TURSO_DATABASE_URL) {
          url = cfEnv.TURSO_DATABASE_URL;
          console.log(`  - Found TURSO_DATABASE_URL in cfEnv`);
        }
        if (!token && cfEnv.TURSO_AUTH_TOKEN) {
          token = cfEnv.TURSO_AUTH_TOKEN;
          console.log(`  - Found TURSO_AUTH_TOKEN in cfEnv`);
        }
      }
    } catch (e) {
      console.log('[getDbCredentials] Not in Cloudflare context or error:', e);
    }
  }
  
  // Method 3: Try process.env (works in local dev)
  if (!url || !token) {
    console.log('[getDbCredentials] Checking process.env...');
    if (!url && process.env.TURSO_DATABASE_URL) {
      url = process.env.TURSO_DATABASE_URL;
      console.log(`  - Found TURSO_DATABASE_URL in process.env`);
    }
    if (!token && process.env.TURSO_AUTH_TOKEN) {
      token = process.env.TURSO_AUTH_TOKEN;
      console.log(`  - Found TURSO_AUTH_TOKEN in process.env`);
    }
  }
  
  // Method 4: Use default fallback values
  if (!url) {
    console.log('[getDbCredentials] Using default TURSO_DATABASE_URL');
    url = DEFAULT_TURSO_URL;
  }
  
  if (!token) {
    console.log('[getDbCredentials] Using default TURSO_AUTH_TOKEN');
    token = DEFAULT_TURSO_TOKEN;
  }
  
  // Final summary
  console.log('[getDbCredentials] === Final Results ===');
  console.log(`- TURSO_DATABASE_URL: ${url ? `Set (${url})` : 'NOT SET'}`);
  console.log(`- TURSO_AUTH_TOKEN: ${token ? `Set (${token.length} chars)` : 'NOT SET'}`);
  
  return { url, token };
}

/**
 * Get JWT secret from environment
 */
export function getJwtSecret(env?: CloudflareEnv | null): string {
  // Try passed env
  if (env?.JWT_SECRET) return env.JWT_SECRET;
  
  // Try Cloudflare context
  try {
    const ctx = getRequestContext();
    const cfEnv = ctx.env as CloudflareEnv;
    if (cfEnv?.JWT_SECRET) return cfEnv.JWT_SECRET;
  } catch {}
  
  // Try process.env
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  
  // Use default fallback
  console.log('[getJwtSecret] Using default JWT_SECRET');
  return DEFAULT_JWT_SECRET;
}

/**
 * Format arguments for Turso HTTP API
 */
function formatArgs(args: unknown[]): TursoCell[] {
  return args.map(arg => {
    if (arg === null || arg === undefined) return { type: 'null' };
    if (typeof arg === 'string') return { type: 'text', value: arg };
    if (typeof arg === 'number') return { type: arg % 1 === 0 ? 'integer' : 'float', value: String(arg) };
    if (typeof arg === 'boolean') return { type: 'integer', value: arg ? '1' : '0' };
    return { type: 'text', value: String(arg) };
  });
}

/**
 * Execute a SQL query against Turso via HTTP
 */
export async function tursoExecute(
  url: string,
  authToken: string,
  sql: string,
  args: unknown[] = []
): Promise<TursoResult> {
  // Convert libsql:// to https://
  const httpUrl = url.startsWith('libsql://') 
    ? url.replace('libsql://', 'https://')
    : url;

  console.log(`[tursoExecute] Executing SQL: ${sql.substring(0, 100)}...`);
  console.log(`[tursoExecute] Args: ${JSON.stringify(args).substring(0, 200)}`);

  const response = await fetch(`${httpUrl}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        type: 'execute',
        stmt: { sql, args: formatArgs(args) },
      }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`[tursoExecute] HTTP error (${response.status}): ${text}`);
    throw new Error(`Turso HTTP error (${response.status}): ${text}`);
  }

  const json = await response.json() as TursoResult;

  // Turso returns HTTP 200 even for SQL failures — check the result body for errors
  const firstResult = json?.results?.[0] as any;
  if (firstResult?.type === 'error') {
    console.error(`[tursoExecute] SQL error: ${JSON.stringify(firstResult.error)}`);
    throw new Error(`Turso SQL error: ${firstResult.error?.message || JSON.stringify(firstResult.error)}`);
  }

  return json;
}

/**
 * Parse Turso result into JavaScript objects
 */
export function parseTursoResult<T = Record<string, unknown>>(result: TursoResult): T[] {
  const cols = result?.results?.[0]?.response?.result?.cols;
  const rows = result?.results?.[0]?.response?.result?.rows;

  if (!cols || !rows) return [];

  return rows.map((row: TursoCell[]) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((col: { name: string }, i: number) => {
      const cell = row[i];
      if (cell?.type === 'null') {
        obj[col.name] = null;
      } else if (cell?.type === 'integer') {
        obj[col.name] = parseInt(cell.value as string, 10);
      } else if (cell?.type === 'float') {
        obj[col.name] = parseFloat(cell.value as string);
      } else {
        obj[col.name] = cell?.value ?? null;
      }
    });
    return obj as T;
  });
}

/**
 * Execute a query and return parsed results
 */
export async function tursoQuery<T = Record<string, unknown>>(
  url: string,
  authToken: string,
  sql: string,
  args: unknown[] = []
): Promise<T[]> {
  const result = await tursoExecute(url, authToken, sql, args);
  return parseTursoResult<T>(result);
}

/**
 * Execute a write operation with verification (for Turso replication delay)
 * This waits after INSERT/UPDATE and verifies the data exists
 */
export async function tursoExecuteWithVerify<T = Record<string, unknown>>(
  url: string,
  authToken: string,
  sql: string,
  args: unknown[] = [],
  verifySql?: string,
  verifyArgs?: unknown[],
  maxRetries: number = 5
): Promise<{ success: boolean; data?: T[] }> {
  // Execute the write operation
  await tursoExecute(url, authToken, sql, args);
  
  // If no verify SQL provided, just return success
  if (!verifySql) {
    return { success: true };
  }
  
  // Wait for replication (increased from 100ms to 300ms)
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Verify with retries (increased delays)
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await tursoQuery<T>(url, authToken, verifySql, verifyArgs || []);
    if (result.length > 0) {
      console.log(`[tursoExecuteWithVerify] Data verified after ${attempt + 1} attempt(s)`);
      return { success: true, data: result };
    }
    // Wait longer between retries (exponential backoff: 200ms, 400ms, 600ms, 800ms, 1000ms)
    const delay = 200 * (attempt + 1);
    console.log(`[tursoExecuteWithVerify] Verification attempt ${attempt + 1} failed, waiting ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  console.warn(`[tursoExecuteWithVerify] Verification failed after ${maxRetries} attempts`);
  return { success: false };
}
