import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
import { getDbContext } from '@/lib/db-context';

export async function GET(request: NextRequest) {
  try {
    const db = getDbContext();
    
    // Test database connection
    const testResult = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM users LIMIT 1`
    ).catch(err => {
      console.error('Database connection test failed:', err);
      return null;
    });

    const dbHealthy = testResult !== null;
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        healthy: dbHealthy,
        message: dbHealthy ? 'Connected' : 'Connection failed'
      },
      environment: {
        tursoUrl: process.env.TURSO_DATABASE_URL ? 'Set' : 'Not set',
        tursoToken: process.env.TURSO_AUTH_TOKEN ? 'Set' : 'Not set',
        jwtSecret: process.env.JWT_SECRET ? 'Set' : 'Not set'
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
