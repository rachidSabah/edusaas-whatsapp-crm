export const runtime = 'edge';

// Test route to debug Turso API response
import { NextRequest } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';

interface CloudflareEnv {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  JWT_SECRET: string;
}

async function tursoQuery(url: string, authToken: string, sql: string, args: any[] = []) {
  const formattedArgs = args.map(arg => {
    if (arg === null) return { type: 'null' };
    if (typeof arg === 'string') return { type: 'text', value: arg };
    if (typeof arg === 'number') return { type: arg % 1 === 0 ? 'integer' : 'float', value: arg };
    if (typeof arg === 'boolean') return { type: 'blob', value: arg ? 1 : 0 };
    return { type: 'text', value: String(arg) };
  });

  const response = await fetch(`${url}/v2/pipeline`, {
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
            args: formattedArgs,
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

export async function GET(request: NextRequest) {
  try {
    const ctx = getRequestContext();
    const env = ctx.env as CloudflareEnv;
    
    const dbUrl = env.TURSO_DATABASE_URL;
    const dbToken = env.TURSO_AUTH_TOKEN;

    const url = dbUrl.startsWith('libsql://') 
      ? dbUrl.replace('libsql://', 'https://')
      : dbUrl;

    const result = await tursoQuery(url, dbToken, 
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      ['admin@edusaas.ma']
    );

    return new Response(JSON.stringify({
      rawResult: result,
      columns: result.results?.[0]?.response?.result?.columns,
      rows: result.results?.[0]?.response?.result?.rows,
      firstRow: result.results?.[0]?.response?.result?.rows?.[0],
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
