export const runtime = 'edge';

import { NextResponse } from 'next/server';

/**
 * Simple ping endpoint - no authentication required
 * Used to verify the API is responding
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'API is responding',
  });
}
