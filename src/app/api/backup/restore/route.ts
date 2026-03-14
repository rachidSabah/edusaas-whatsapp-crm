export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { restoreBackup, verifyBackup } from '@/lib/backup';

// Restore from uploaded backup file
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { backupData, overwrite = false, tables } = body;

    if (!backupData) {
      return NextResponse.json(
        { error: 'Backup data is required' },
        { status: 400 }
      );
    }

    // Verify backup integrity
    const isValid = await verifyBackup(backupData);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid backup file: checksum verification failed' },
        { status: 400 }
      );
    }

    // Check if backup belongs to this organization
    if (backupData.organizationId && backupData.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Backup file belongs to a different organization' },
        { status: 403 }
      );
    }

    // Restore data
    const result = await restoreBackup(backupData, {
      organizationId: user.organizationId,
      overwrite,
      tables,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Restore backup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
