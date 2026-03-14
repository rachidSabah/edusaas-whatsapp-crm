export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { tursoQuery, tursoExecute, type CloudflareEnv } from '@/lib/turso-http';

// No auth required - for debugging only
export async function GET(request: NextRequest) {
  try {
    const ctx = getRequestContext();
    const env = ctx.env as CloudflareEnv;
    
    const dbUrl = env.TURSO_DATABASE_URL;
    const dbToken = env.TURSO_AUTH_TOKEN;

    if (!dbUrl || !dbToken) {
      return NextResponse.json({ error: 'DB credentials not set' }, { status: 500 });
    }

    // Get all organizations
    const orgs = await tursoQuery(dbUrl, dbToken, `SELECT * FROM organizations`);
    
    // Get all users with phone
    const users = await tursoQuery(dbUrl, dbToken, `SELECT id, email, name, role, organizationId, phone FROM users`);

    // Get all teachers
    const teachers = await tursoQuery(dbUrl, dbToken, `SELECT * FROM teachers`);

    return NextResponse.json({
      organizations: orgs,
      organizationsCount: orgs.length,
      users: users,
      usersCount: users.length,
      teachers: teachers,
      teachersCount: teachers.length,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: String(error),
      stack: error?.stack,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = getRequestContext();
    const env = ctx.env as CloudflareEnv;
    
    const dbUrl = env.TURSO_DATABASE_URL;
    const dbToken = env.TURSO_AUTH_TOKEN;
    const body = await request.json();
    
    const { name, email, phone, address, city, country, userId } = body;
    
    // Create organization
    const id = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') || `org-${Date.now()}`;
    const now = new Date().toISOString();
    
    await tursoExecute(dbUrl, dbToken,
      `INSERT INTO organizations (id, name, slug, email, phone, address, city, country, plan, isActive, aiEnabled, aiDailyLimit, aiDailyUsed, whatsappConnected, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'starter', 1, 1, 1000, 0, 0, ?, ?)`,
      [id, name, slug, email, phone || null, address || null, city || null, country || 'Morocco', now, now]
    );
    
    // Update user with organizationId
    if (userId) {
      await tursoExecute(dbUrl, dbToken,
        `UPDATE users SET organizationId = ? WHERE id = ?`,
        [id, userId]
      );
    }
    
    const result = await tursoQuery(dbUrl, dbToken, `SELECT * FROM organizations WHERE id = ?`, [id]);
    
    return NextResponse.json({ 
      success: true,
      organization: result[0],
      orgId: id
    });
  } catch (error: any) {
    return NextResponse.json({
      error: String(error),
      details: error?.message,
    }, { status: 500 });
  }
}

// Update organization
export async function PUT(request: NextRequest) {
  try {
    const ctx = getRequestContext();
    const env = ctx.env as CloudflareEnv;
    
    const dbUrl = env.TURSO_DATABASE_URL;
    const dbToken = env.TURSO_AUTH_TOKEN;
    const body = await request.json();
    
    const { id, name, email, phone, address, city, country } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }
    
    const now = new Date().toISOString();
    
    await tursoExecute(dbUrl, dbToken,
      `UPDATE organizations SET name = ?, email = ?, phone = ?, address = ?, city = ?, country = ?, updatedAt = ? WHERE id = ?`,
      [name, email, phone || null, address || null, city || null, country || 'Morocco', now, id]
    );
    
    const result = await tursoQuery(dbUrl, dbToken, `SELECT * FROM organizations WHERE id = ?`, [id]);
    
    return NextResponse.json({ 
      success: true,
      organization: result[0]
    });
  } catch (error: any) {
    return NextResponse.json({
      error: String(error),
      details: error?.message,
    }, { status: 500 });
  }
}
