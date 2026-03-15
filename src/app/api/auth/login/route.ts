export const runtime = 'edge';

// Authentication API route - Edge Runtime compatible for Cloudflare
// This route handles user login with email/password authentication

import { NextRequest } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { type CloudflareEnv, getDbCredentials } from '@/lib/turso-http';
import { authenticateUser, setAuthCookie } from '@/lib/auth-edge';

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] Login attempt started`);
    
    // 1. Get Cloudflare environment bindings
    let cfEnv: CloudflareEnv | null = null;
    try {
      const ctx = getRequestContext();
      cfEnv = ctx.env as CloudflareEnv;
      console.log(`[${requestId}] Cloudflare context available: ${cfEnv ? 'Yes' : 'No'}`);
    } catch (ctxError) {
      console.log(`[${requestId}] Not in Cloudflare context, using process.env`);
    }

    // 2. Get database credentials with detailed error handling
    let dbUrl: string;
    let dbToken: string;
    
    try {
      const credentials = getDbCredentials(cfEnv);
      dbUrl = credentials.url;
      dbToken = credentials.token;
      console.log(`[${requestId}] Database URL: ${dbUrl ? 'Set' : 'Missing'}`);
      console.log(`[${requestId}] Auth token: ${dbToken ? 'Set (length: ' + dbToken.length + ')' : 'Missing'}`);
    } catch (credError) {
      console.error(`[${requestId}] Credential error:`, credError);
      return new Response(
        JSON.stringify({ 
          error: 'Database configuration error', 
          details: credError instanceof Error ? credError.message : String(credError),
          requestId 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse request body
    let email: string | undefined;
    let password: string | undefined;
    
    try {
      const body = await request.json() as { email?: string; password?: string };
      email = body.email;
      password = body.password;
      console.log(`[${requestId}] Email provided: ${email ? 'Yes' : 'No'}`);
    } catch (parseError) {
      console.error(`[${requestId}] Body parse error:`, parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request body', 
          details: 'Could not parse JSON body',
          requestId 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Validate required fields
    if (!email || !password) {
      console.log(`[${requestId}] Missing email or password`);
      return new Response(
        JSON.stringify({ 
          error: 'Email and password are required',
          requestId 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Check if token is available
    if (!dbToken) {
      console.error(`[${requestId}] TURSO_AUTH_TOKEN not configured`);
      return new Response(
        JSON.stringify({ 
          error: 'Database configuration missing', 
          details: 'TURSO_AUTH_TOKEN environment variable is not set. Please configure it in your Cloudflare Pages settings (Settings > Environment variables).',
          hint: 'Go to Cloudflare Dashboard > Pages > edusaas-whatsapp-crm > Settings > Environment variables and add TURSO_AUTH_TOKEN',
          requestId 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Authenticate user
    console.log(`[${requestId}] Attempting authentication for: ${email}`);
    let result;
    
    try {
      result = await authenticateUser(email, password, dbUrl, dbToken);
    } catch (authError) {
      console.error(`[${requestId}] Authentication error:`, authError);
      return new Response(
        JSON.stringify({ 
          error: 'Authentication failed', 
          details: authError instanceof Error ? authError.message : String(authError),
          stack: authError instanceof Error ? authError.stack : undefined,
          requestId 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!result) {
      console.log(`[${requestId}] Invalid credentials for: ${email}`);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid email or password',
          requestId 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. Set auth cookie
    try {
      await setAuthCookie(result.token);
      console.log(`[${requestId}] Auth cookie set successfully`);
    } catch (cookieError) {
      console.error(`[${requestId}] Cookie error:`, cookieError);
      // Continue anyway - return token in response
    }

    // 8. Return success response
    console.log(`[${requestId}] Login successful for: ${email}`);
    return new Response(
      JSON.stringify({
        success: true,
        user: result.user,
        token: result.token,
        requestId 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    // Catch-all error handler with full stack trace
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.constructor.name : 'UnknownError';
    
    console.error(`[${requestId}] Unhandled error:`, {
      name: errorName,
      message: errorMessage,
      stack: errorStack
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: errorMessage,
        errorType: errorName,
        stack: errorStack,
        requestId,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
