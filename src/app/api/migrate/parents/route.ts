export const runtime = 'edge';

/**
 * Database Migration Endpoint for Parent Fields
 * Adds parent1Name, parent1Phone, parent1Whatsapp, parent2Name, parent2Phone, parent2Whatsapp to students table
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

const ALTER_TABLE_SQL = [
  `ALTER TABLE students ADD COLUMN parent1Name TEXT`,
  `ALTER TABLE students ADD COLUMN parent1Phone TEXT`,
  `ALTER TABLE students ADD COLUMN parent1Whatsapp INTEGER DEFAULT 0`,
  `ALTER TABLE students ADD COLUMN parent2Name TEXT`,
  `ALTER TABLE students ADD COLUMN parent2Phone TEXT`,
  `ALTER TABLE students ADD COLUMN parent2Whatsapp INTEGER DEFAULT 0`,
];

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Only SUPER_ADMIN can run migrations
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only SUPER_ADMIN can run migrations' },
        { status: 403 }
      );
    }

    const db = getDbContext();
    const results: { column: string; status: string; error?: string }[] = [];

    for (const sql of ALTER_TABLE_SQL) {
      try {
        await db.execute(sql);
        const columnMatch = sql.match(/ADD COLUMN (\w+)/);
        if (columnMatch) {
          results.push({ column: columnMatch[1], status: 'added' });
        }
      } catch (error: any) {
        const columnMatch = sql.match(/ADD COLUMN (\w+)/);
        if (columnMatch) {
          if (error.message?.includes('duplicate column') || error.message?.includes('already exists')) {
            results.push({ column: columnMatch[1], status: 'exists' });
          } else {
            results.push({ column: columnMatch[1], status: 'error', error: error.message });
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Parent fields migration completed',
      results,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    // Check if the columns exist by trying to query them
    try {
      const result = await db.query(
        `SELECT parent1Name, parent1Phone, parent1Whatsapp, parent2Name, parent2Phone, parent2Whatsapp FROM students LIMIT 1`
      );
      return NextResponse.json({
        migrationStatus: 'migrated',
        columns: ['parent1Name', 'parent1Phone', 'parent1Whatsapp', 'parent2Name', 'parent2Phone', 'parent2Whatsapp'],
      });
    } catch (error: any) {
      if (error.message?.includes('no such column')) {
        return NextResponse.json({
          migrationStatus: 'not_migrated',
          message: 'Parent columns do not exist. Run POST to migrate.',
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Migration check error:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status', details: error.message },
      { status: 500 }
    );
  }
}
