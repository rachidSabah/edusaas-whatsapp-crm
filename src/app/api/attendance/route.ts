
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface AttendanceRecord {
  id: string;
  organizationId: string;
  studentId: string;
  groupId: string | null;
  date: string;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// GET attendance records
export async function GET(request: NextRequest) {
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
    const date = searchParams.get('date');
    const groupId = searchParams.get('groupId');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = `SELECT * FROM attendance WHERE organizationId = ?`;
    const params: any[] = [user.organizationId];

    if (date) {
      query += ` AND date = ?`;
      params.push(date);
    }

    if (groupId) {
      query += ` AND groupId = ?`;
      params.push(groupId);
    }

    query += ` ORDER BY createdAt DESC LIMIT ?`;
    params.push(limit);

    const records = await db.query<AttendanceRecord>(query, params);

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance records', details: String(error) },
      { status: 500 }
    );
  }
}

// POST new attendance record
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
    const { studentId, groupId, date, status, notes } = body;

    if (!studentId || !date || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO attendance (id, organizationId, studentId, groupId, date, status, notes, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user.organizationId, studentId, groupId || null, date, status, notes || null, now, now]
    );

    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Attendance POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create attendance record', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT update attendance record
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
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    await db.execute(
      `UPDATE attendance SET status = ?, notes = ?, updatedAt = ? WHERE id = ? AND organizationId = ?`,
      [status, notes || null, now, id, user.organizationId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Attendance PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update attendance record', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE attendance record
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
        { error: 'Missing attendance ID' },
        { status: 400 }
      );
    }

    await db.execute(
      `DELETE FROM attendance WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Attendance DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete attendance record', details: String(error) },
      { status: 500 }
    );
  }
}
