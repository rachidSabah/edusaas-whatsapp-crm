export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';
import { exportOrganizationData, generateBackupFilename } from '@/lib/backup';

// Download backup as JSON file
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Get organization name
    const orgResult = await db.query<{ name: string }>(
      `SELECT name FROM organizations WHERE id = ?`,
      [user.organizationId]
    );
    const organizationName = orgResult[0]?.name || 'Organization';
    
    const backupData = await exportOrganizationData(user.organizationId);
    const filename = generateBackupFilename(organizationName);

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Download backup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
