export const runtime = 'edge';

// Authentication API route - Edge Runtime compatible for Cloudflare
import { NextRequest } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { type CloudflareEnv, tursoQuery } from '@/lib/turso-http';
import { authenticateUser, setAuthCookie } from '@/lib/auth-edge';

export async function POST(request: NextRequest) {
  try {
    // 1. Safely grab Cloudflare's environment bindings
    const ctx = getRequestContext();
    const env = ctx.env as CloudflareEnv;
    
    const dbUrl = env.TURSO_DATABASE_URL;
    const dbToken = env.TURSO_AUTH_TOKEN;

    if (!dbUrl || !dbToken) {
      return new Response(
        JSON.stringify({ error: 'Database configuration missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Authenticate user
    const result = await authenticateUser(email, password, dbUrl, dbToken);

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Set auth cookie
    await setAuthCookie(result.token);

    // 5. Return success response
    return new Response(
      JSON.stringify({
        user: result.user,
        token: result.token,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
