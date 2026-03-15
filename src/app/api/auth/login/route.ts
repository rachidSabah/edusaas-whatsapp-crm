export const runtime = 'edge';

// Authentication API route - Edge Runtime compatible for Cloudflare
import { NextRequest } from 'next/server';
import { type CloudflareEnv, getDbCredentials } from '@/lib/turso-http';
import { authenticateUser, setAuthCookie } from '@/lib/auth-edge';

export async function POST(request: NextRequest) {
  try {
    // Get database credentials
    const { url: dbUrl, token: dbToken } = getDbCredentials(null);

    // Parse request body
    const body = await request.json() as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is available
    if (!dbToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Database configuration missing', 
          details: 'TURSO_AUTH_TOKEN environment variable is not set. Please configure it in your Cloudflare Pages settings.' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const result = await authenticateUser(email, password, dbUrl, dbToken);

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Invalid email or password' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Set auth cookie
    await setAuthCookie(result.token);

    // Return success response
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
