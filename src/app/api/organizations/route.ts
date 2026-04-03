export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  locale: string | null;
  plan: string;
  isActive: number;
  aiEnabled: number;
  aiDailyLimit: number;
  aiDailyUsed: number;
  whatsappConnected: number;
  whatsappPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

// Get organizations
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (user.role === 'SUPER_ADMIN') {
      const organizations = await db.query<Organization>(
        `SELECT * FROM organizations ORDER BY createdAt DESC`, 
        []
      );
      return NextResponse.json({ organizations });
    } else if (user.organizationId) {
      const organizations = await db.query<Organization>(
        `SELECT * FROM organizations WHERE id = ?`, 
        [user.organizationId]
      );
      return NextResponse.json({ organizations });
    }

    return NextResponse.json({ organizations: [] });
  } catch (error: any) {
    console.error('Get organizations error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Create organization
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, email, phone, address, city, country, plan, locale } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-') || `org-${Date.now()}`;

    const existing = await db.query<{ id: string }>(
      `SELECT id FROM organizations WHERE slug = ?`,
      [finalSlug]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Organization with this slug already exists' }, { status: 400 });
    }

    const id = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO organizations (id, name, slug, email, phone, address, city, country, plan, locale, isActive, aiEnabled, aiDailyLimit, aiDailyUsed, whatsappConnected, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1000, 0, 0, ?, ?)`,
      [id, name, finalSlug, email, phone || null, address || null, city || null, country || 'Morocco', plan || 'starter', locale || 'fr', now, now]
    );

    const result = await db.query<Organization>(
      `SELECT * FROM organizations WHERE id = ?`, 
      [id]
    );

    return NextResponse.json({ organization: result[0] });
  } catch (error: any) {
    console.error('Create organization error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Update organization
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();
    const body = await request.json();
    
    const { id, name, email, phone, address, city, country, plan, locale, isActive, aiEnabled, aiDailyLimit, whatsappConnected, whatsappPhone } = body;

    console.log('PUT organizations - user:', user.id, 'role:', user.role, 'targetOrgId:', id, 'userOrgId:', user.organizationId);

    if (!id) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (user.role !== 'SUPER_ADMIN' && user.organizationId !== id) {
      return NextResponse.json({ error: 'Unauthorized - cannot edit this organization' }, { status: 403 });
    }

    // Check if organization exists
    const orgs = await db.query<{ id: string }>(
      `SELECT id FROM organizations WHERE id = ?`, 
      [id]
    );

    if (orgs.length === 0) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Build update
    const updates: string[] = [];
    const args: any[] = [];

    if (user.role === 'SUPER_ADMIN') {
      if (name !== undefined) { updates.push('name = ?'); args.push(name); }
      if (plan !== undefined) { updates.push('plan = ?'); args.push(plan); }
      if (isActive !== undefined) { updates.push('isActive = ?'); args.push(isActive ? 1 : 0); }
      if (aiDailyLimit !== undefined) { updates.push('aiDailyLimit = ?'); args.push(aiDailyLimit); }
    }

    if (email !== undefined) { updates.push('email = ?'); args.push(email); }
    if (phone !== undefined) { updates.push('phone = ?'); args.push(phone || null); }
    if (address !== undefined) { updates.push('address = ?'); args.push(address || null); }
    if (city !== undefined) { updates.push('city = ?'); args.push(city || null); }
    if (country !== undefined) { updates.push('country = ?'); args.push(country); }
    if (locale !== undefined) { updates.push('locale = ?'); args.push(locale); }
    if (aiEnabled !== undefined) { updates.push('aiEnabled = ?'); args.push(aiEnabled ? 1 : 0); }
    if (whatsappConnected !== undefined) { updates.push('whatsappConnected = ?'); args.push(whatsappConnected ? 1 : 0); }
    if (whatsappPhone !== undefined) { updates.push('whatsappPhone = ?'); args.push(whatsappPhone || null); }

    const now = new Date().toISOString();
    updates.push('updatedAt = ?');
    args.push(now);
    args.push(id);

    const sql = `UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`;
    console.log('PUT organizations - SQL:', sql);

    await db.execute(sql, args);

    const result = await db.query<Organization>(
      `SELECT * FROM organizations WHERE id = ?`, 
      [id]
    );

    console.log('PUT organizations - success:', result[0]?.name);

    return NextResponse.json({ organization: result[0] });
  } catch (error: any) {
    console.error('Update organization error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error), stack: error?.stack },
      { status: 500 }
    );
  }
}
