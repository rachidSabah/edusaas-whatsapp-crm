export const runtime = 'edge';

// Authentication API route - Using Hybrid Database (D1 + Turso)
import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, setAuthCookie } from '@/lib/auth-hybrid';

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  try {
    console.log(`[${requestId}] === LOGIN ATTEMPT (Hybrid) ===`);
    
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
    
    // Authenticate user using hybrid database
    const result = await authenticateUser(email, password);

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
      requestId 
    }, { status: 500 });
  }
}
