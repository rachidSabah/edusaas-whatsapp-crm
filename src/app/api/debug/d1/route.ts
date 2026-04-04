export const runtime = 'edge';

// Debug endpoint for D1 database connection
import { NextResponse } from 'next/server';
import { getDbContext } from '@/lib/db-hybrid';

export async function GET() {
  try {
    const db = getDbContext();
    
    // Test query - get tables
    const tables = await db.query<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`
    );
    
    // Get admin user
    const adminUser = await db.query<{
      id: string;
      email: string;
      name: string;
      role: string;
      organizationId: string | null;
    }>(
      `SELECT id, email, name, role, organizationId FROM users WHERE email = ?`,
      'admin@edusaas.ma'
    );
    
    // Get organization count
    const orgCount = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM organizations`
    );
    
    // Get user count
    const userCount = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM users`
    );
    
    return NextResponse.json({
      status: 'ok',
      database: 'D1 (Cloudflare)',
      tables: tables.map(t => t.name),
      stats: {
        organizations: orgCount[0]?.count || 0,
        users: userCount[0]?.count || 0,
      },
      adminUser: adminUser[0] || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('D1 Debug error:', error);
    return NextResponse.json({
      status: 'error',
      database: 'D1 (Cloudflare)',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
