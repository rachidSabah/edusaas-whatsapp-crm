export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

// Setup endpoint to initialize SUPER_ADMIN with default organization
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    // Only SUPER_ADMIN can run setup
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - only SUPER_ADMIN can run setup' },
        { status: 403 }
      );
    }

    // Check if user already has an organization
    if (user.organizationId) {
      return NextResponse.json({
        message: 'User already has an organization',
        organizationId: user.organizationId
      });
    }

    // Create default organization for SUPER_ADMIN
    const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.execute(
      `INSERT INTO organizations (id, name, slug, email, phone, address, city, country, plan, locale, isActive, aiEnabled, aiDailyLimit, aiDailyUsed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 1000, 0)`,
      [orgId, 'EduSaaS Admin Organization', 'edusaas-admin', user.email, null, null, null, 'Morocco', 'enterprise', 'fr']
    );

    // Update SUPER_ADMIN user with organizationId
    await db.execute(
      `UPDATE users SET organizationId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [orgId, user.id]
    );

    return NextResponse.json({
      message: 'Setup completed successfully',
      organizationId: orgId,
      organization: {
        id: orgId,
        name: 'EduSaaS Admin Organization',
        slug: 'edusaas-admin'
      }
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Get setup status
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    // Check if user has an organization
    const needsSetup = !user.organizationId;

    // Check if any organizations exist
    const orgs = await db.query<{ id: string }>(`SELECT id FROM organizations LIMIT 1`, []);
    const hasOrganizations = orgs.length > 0;

    return NextResponse.json({
      needsSetup,
      hasOrganization: !!user.organizationId,
      hasOrganizations,
      userRole: user.role,
      organizationId: user.organizationId
    });
  } catch (error) {
    console.error('Get setup status error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
