export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';
import { 
  exportOrganizationData, 
  createBackupRecord,
  getBackupHistory,
  generateBackupFilename
} from '@/lib/backup';

// Get backup history
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ history: [] });
    }

    // Create backup_history table if not exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS backup_history (
        id TEXT PRIMARY KEY,
        organizationId TEXT NOT NULL,
        type TEXT DEFAULT 'full',
        size INTEGER DEFAULT 0,
        recordCount INTEGER DEFAULT 0,
        status TEXT DEFAULT 'completed',
        downloadUrl TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const history = await getBackupHistory(user.organizationId);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Get backup history error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Create new backup
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
    const { type = 'full' } = body;

    // Create backup_history table if not exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS backup_history (
        id TEXT PRIMARY KEY,
        organizationId TEXT NOT NULL,
        type TEXT DEFAULT 'full',
        size INTEGER DEFAULT 0,
        recordCount INTEGER DEFAULT 0,
        status TEXT DEFAULT 'completed',
        downloadUrl TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get organization name
    const orgResult = await db.query<{ name: string }>(
      `SELECT name FROM organizations WHERE id = ?`,
      [user.organizationId]
    );
    const organizationName = orgResult[0]?.name || 'Organization';

    // Export data
    const backupData = await exportOrganizationData(user.organizationId);
    const backupJson = JSON.stringify(backupData, null, 2);
    const size = new TextEncoder().encode(backupJson).length;

    // Count total records
    let recordCount = 0;
    for (const table of Object.values(backupData.tables)) {
      recordCount += (table as any[]).length;
    }

    // Create backup record
    const backupId = await createBackupRecord(
      user.organizationId,
      type,
      size,
      recordCount
    );

    // Return backup data for download
    return NextResponse.json({
      success: true,
      backupId,
      filename: generateBackupFilename(organizationName),
      size,
      recordCount,
      data: backupData,
    });
  } catch (error) {
    console.error('Create backup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
