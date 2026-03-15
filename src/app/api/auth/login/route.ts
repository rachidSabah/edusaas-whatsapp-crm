export const runtime = 'edge';

// Authentication API route - Edge Runtime compatible for Cloudflare
import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { tursoQuery, getDbCredentials, type CloudflareEnv } from '@/lib/turso-http';
import { authenticateUser, setAuthCookie } from '@/lib/auth-edge';

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[${requestId}] === LOGIN ATTEMPT ===`);
    
    // Get Cloudflare environment bindings
    let cfEnv: CloudflareEnv | null = null;
    try {
      const ctx = getRequestContext();
      cfEnv = ctx.env as CloudflareEnv;
      console.log(`[${requestId}] Cloudflare context available`);
      console.log(`[${requestId}] Available env keys: ${Object.keys(cfEnv || {}).join(', ')}`);
    } catch (e) {
      console.log(`[${requestId}] Not in Cloudflare context:`, e);
    }
    
    // Get database credentials
    let dbUrl: string;
    let dbToken: string;
    
    try {
      const credentials = getDbCredentials(cfEnv);
      dbUrl = credentials.url;
      dbToken = credentials.token;
    } catch (credError) {
      console.error(`[${requestId}] Credential error:`, credError);
      return NextResponse.json({ 
        error: 'Database configuration error', 
        details: credError instanceof Error ? credError.message : String(credError),
        requestId 
      }, { status: 500 });
    }

    // Parse request body
    const body = await request.json() as { email?: string; password?: string };
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ 
        error: 'Email and password are required',
        requestId 
      }, { status: 400 });
    }

    console.log(`[${requestId}] Authenticating: ${email}`);
    
    // Authenticate user
    const result = await authenticateUser(email, password, dbUrl, dbToken);

    if (!result) {
      console.log(`[${requestId}] Invalid credentials`);
      return NextResponse.json({ 
        error: 'Invalid email or password',
        requestId 
      }, { status: 401 });
    }

    // Set auth cookie
    await setAuthCookie(result.token);

    console.log(`[${requestId}] Login successful`);
    return NextResponse.json({
      success: true,
      user: result.user,
      token: result.token,
      requestId 
    });
    
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      requestId 
    }, { status: 500 });
  }
}
