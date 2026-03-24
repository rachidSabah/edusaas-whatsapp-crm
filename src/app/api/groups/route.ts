export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

interface Group {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  description: string | null;
  schedule: string | null;
  teacherId: string | null;
  capacity: number | null;
  year1StartDate: string | null;
  year1EndDate: string | null;
  year2StartDate: string | null;
  year2EndDate: string | null;
  currentYear: number;
  createdAt: string;
  updatedAt: string;
  studentCount?: number;
  teacherName: string | null;
}

// Get groups
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ 
        groups: [],
        message: 'Aucune organisation associée.'
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }
    
    // Verify organization exists
    const orgCheck = await db.query<{ id: string }>(
      `SELECT id FROM organizations WHERE id = ?`,
      [user.organizationId]
    );
    
    if (orgCheck.length === 0) {
      console.warn(`[Groups API] Organization ${user.organizationId} not found for user ${user.id}`);
      return NextResponse.json({ 
        groups: [],
        message: 'Organisation non trouvée.'
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // Get groups with student count
    const rows = await db.query<Group>(
      `SELECT g.*, 
            (SELECT COUNT(*) FROM students s WHERE s.groupId = g.id) as studentCount,
            u.name as teacherName
            FROM groups g
            LEFT JOIN users u ON g.teacherId = u.id
            WHERE g.organizationId = ?
            ORDER BY g.createdAt DESC`,
      [user.organizationId]
    );

    const groups = rows.map(row => ({
      ...row,
      studentCount: row.studentCount || 0,
      teacher: row.teacherId ? { id: row.teacherId, name: row.teacherName } : null,
    }));

    return NextResponse.json({ groups }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Get groups error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Create group
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

    const body = await request.json();
    const { 
      name, 
      code, 
      description, 
      schedule, 
      teacherId, 
      capacity,
      year1StartDate,
      year1EndDate,
      year2StartDate,
      year2EndDate,
      currentYear
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Check if group with this name already exists
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM groups WHERE organizationId = ? AND name = ?`,
      [user.organizationId, name]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Group with this name already exists' },
        { status: 400 }
      );
    }

    const id = `grp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Simple INSERT — omitting study period fields so it works even if DB hasn't been migrated
    await db.execute(
      `INSERT INTO groups (id, organizationId, name, code, description, schedule, teacherId, capacity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.organizationId,
        name,
        code || null,
        description || null,
        schedule || null,
        teacherId || null,
        capacity || null,
      ]
    );

    // Build the group object from what we just inserted — no need to query back
    const group: Group = {
      id,
      organizationId: user.organizationId,
      name,
      code: code || null,
      description: description || null,
      schedule: schedule || null,
      teacherId: teacherId || null,
      capacity: capacity || null,
      year1StartDate: year1StartDate || null,
      year1EndDate: year1EndDate || null,
      year2StartDate: year2StartDate || null,
      year2EndDate: year2EndDate || null,
      currentYear: currentYear || 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      teacherName: null,
    };

    console.log(`[Create group] Successfully inserted group: ${group.name} (${group.id})`);
    return NextResponse.json({ success: true, group });
  } catch (error) {
    console.error('Create group error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `DEBUG SQL ERROR: ${errorMsg}`, details: String(error) },
      { status: 500 }
    );
  }
}

// Update group
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      id, 
      name, 
      code, 
      description, 
      schedule, 
      teacherId, 
      capacity,
      year1StartDate,
      year1EndDate,
      year2StartDate,
      year2EndDate,
      currentYear
    } = body;

    // Verify group belongs to organization
    const check = await db.query<{ id: string }>(
      `SELECT id FROM groups WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    await db.execute(
      `UPDATE groups SET 
            name = COALESCE(?, name),
            code = COALESCE(?, code),
            description = COALESCE(?, description),
            schedule = COALESCE(?, schedule),
            teacherId = COALESCE(?, teacherId),
            capacity = COALESCE(?, capacity),
            year1StartDate = COALESCE(?, year1StartDate),
            year1EndDate = COALESCE(?, year1EndDate),
            year2StartDate = COALESCE(?, year2StartDate),
            year2EndDate = COALESCE(?, year2EndDate),
            currentYear = COALESCE(?, currentYear),
            updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
      [name, code, description, schedule, teacherId, capacity, 
       year1StartDate, year1EndDate, year2StartDate, year2EndDate, currentYear, id]
    );

    // Fetch updated group
    const result = await db.query<Group>(
      `SELECT g.*, u.name as teacherName
            FROM groups g
            LEFT JOIN users u ON g.teacherId = u.id
            WHERE g.id = ?`,
      [id]
    );

    const group = result[0];

    return NextResponse.json({ group });
  } catch (error) {
    console.error('Update group error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Delete group
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      );
    }

    // Verify group belongs to organization
    const check = await db.query<{ id: string }>(
      `SELECT id FROM groups WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    await db.execute(`DELETE FROM groups WHERE id = ?`, [id]);

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
