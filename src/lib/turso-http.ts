// Turso HTTP Client for Cloudflare Edge Runtime
// This module provides a simple HTTP-based Turso client that works with Cloudflare Workers

export interface CloudflareEnv {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  JWT_SECRET: string;
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
 * Format arguments for Turso HTTP API
 * Turso expects all values as strings in the JSON payload
 */
function formatArgs(args: any[]): TursoCell[] {
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
  args: any[] = []
): Promise<TursoResult> {
  // Ensure URL uses https://
  const httpUrl = url.startsWith('libsql://') 
    ? url.replace('libsql://', 'https://')
    : url;

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
    throw new Error(`Turso error: ${response.status} - ${text}`);
  }

  return await response.json();
}

/**
 * Parse Turso result into JavaScript objects
 */
export function parseTursoResult<T = Record<string, any>>(result: TursoResult): T[] {
  const cols = result?.results?.[0]?.response?.result?.cols;
  const rows = result?.results?.[0]?.response?.result?.rows;

  if (!cols || !rows) return [];

  return rows.map((row: TursoCell[]) => {
    const obj: Record<string, any> = {};
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
export async function tursoQuery<T = Record<string, any>>(
  url: string,
  authToken: string,
  sql: string,
  args: any[] = []
): Promise<T[]> {
  const result = await tursoExecute(url, authToken, sql, args);
  return parseTursoResult<T>(result);
}
