// Turso HTTP Client for Cloudflare Edge Runtime
// This module provides a simple HTTP-based Turso client that works with Cloudflare Workers

import { getRequestContext } from '@cloudflare/next-on-pages';

// Database credentials - set via Cloudflare Dashboard environment variables
// Required: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, JWT_SECRET
// NOTE: For secrets, environment variables
// Cloudflare will encrypt them at runtime.
// Access: Try env.VARIABLE_NAME first (works for both plain and secret)
// Then fall back to process.env.VARIABLE_NAME

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
 * Get Cloudflare environment bindings
 * Returns null if not in Cloudflare context
 */
function getCloudflareEnv(): CloudflareEnv | null {
  try {
    const ctx = getRequestContext();
    return ctx.env as CloudflareEnv;
  } catch {
    // Not in Cloudflare context (local development or other environments)
    return null;
  }
}

/**
 * Get a specific environment variable
 * Tries multiple sources in order:
 * 1. env parameter (passed explicitly)
 * 2. Cloudflare bindings (env.VARIABLE_NAME)
 * 3. process.env.VARIABLE_NAME
 */
function getEnvVar(name: string, env?: CloudflareEnv | null): string | undefined {
  // Try explicit parameter first
  if (env && env[name as keyof CloudflareEnv]) {
    return env[name as keyof CloudflareEnv];
  }
  
  // Try Cloudflare context
  const cfEnv = getCloudflareEnv();
  if (cfEnv && cfEnv[name as keyof CloudflareEnv]) {
    return cfEnv[name as keyof CloudflareEnv];
  }
  
  // Fall back to process.env
  return process.env[name];
}

/**
 * Get database credentials with clear error handling
 * MUST have TURSO_AUTH_TOKEN set either in Cloudflare or process.env
 */
export function getDbCredentials(env?: CloudflareEnv | null): { url: string; token: string } {
  const url = getEnvVar('TURSO_DATABASE_URL', env);
  const token = getEnvVar('TURSO_AUTH_TOKEN', env);
  
  // Debug logging
  const cfEnv = getCloudflareEnv();
  console.log('[DbCredentials] Checking credentials...');
  console.log(`- Cloudflare context: ${cfEnv ? 'Yes' : 'No'}`);
  console.log(`- TURSO_DATABASE_URL: ${url ? 'Set' : 'Not set'}`);
  console.log(`- TURSO_AUTH_TOKEN: ${token ? `Set (${token.length} chars)` : 'Not set'}`);
  
  // Clear error if token is missing
  if (!token) {
    const errorDetails = [
      'TURSO_AUTH_TOKEN is not configured.',
      '',
      'To fix this:',
      '1. Go to Cloudflare Dashboard → Pages → Your Project → Settings → Environment variables',
      '2. Add TURSO_AUTH_TOKEN with your Turso database token',
      '3. Get token from: https://turso.tech/app → Your Database → Settings → Tokens',
      '',
      'Current context:',
      `- In Cloudflare: ${cfEnv ? 'Yes' : 'No'}`,
      `- process.env.TURSO_AUTH_TOKEN: ${process.env.TURSO_AUTH_TOKEN ? 'Set' : 'Not set'}`,
    ].join('\n');
    
    throw new Error(errorDetails);
  }
  
  if (!url) {
    throw new Error('TURSO_DATABASE_URL is not configured. Please set it in your environment variables.');
  }
  
  return { url, token };
}

/**
 * Get JWT secret with clear error handling
 */
export function getJwtSecret(env?: CloudflareEnv | null): string {
  const secret = getEnvVar('JWT_SECRET', env);
  
  if (!secret) {
    console.warn('WARNING: JWT_SECRET not set. Using development fallback. Set JWT_SECRET in production!');
    return 'edusaas-jwt-secret-key-development-fallback';
  }
  
  return secret;
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

  const startTime = Date.now();
  
  try {
    const response = await fetch(`${httpUrl}/v2/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            type: 'execute',
            stmt: {
              sql,
              args: formatArgs(args),
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      const duration = Date.now() - startTime;
      
      // Parse and provide clear error message
      let errorDetail = text;
      try {
        const jsonError = JSON.parse(text);
        errorDetail = jsonError.error || jsonError.message || text;
      } catch {
        // Keep original text
      }
      
      throw new Error(
        `Turso database error (${response.status}) after ${duration}ms:\n` +
        `  SQL: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}\n` +
        `  Error: ${errorDetail}\n` +
        `  Check: Is your TURSO_AUTH_TOKEN valid and not expired?`
      );
    }

    return await response.json();
  } catch (error) {
    // Re-throw with context if it's our error
    if (error instanceof Error && error.message.includes('Turso')) {
      throw error;
    }
    
    // Network or other errors
    throw new Error(
      `Failed to connect to Turso database:\n` +
      `  URL: ${httpUrl}\n` +
      `  Error: ${error instanceof Error ? error.message : String(error)}\n` +
      `  Check: Is the database URL correct and accessible?`
    );
  }
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
