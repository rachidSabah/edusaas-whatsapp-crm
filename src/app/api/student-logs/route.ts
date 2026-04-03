import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface StudentLog {
  id: string;
  studentId: string;
  organizationId: string;
  type: string;
  date: string;
  time: string;
  description: string;
  severity: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Get student logs
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ logs: [] });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    const logs = await db.query<StudentLog>(
      `SELECT * FROM student_logs WHERE organizationId = ? AND studentId = ? ORDER BY date DESC, time DESC`,
      [user.organizationId, studentId]
    );

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Get student logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create student log
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body = await request.json();
    const { studentId, type, date, time, description, severity } = body;

    if (!studentId || !type || !date || !time || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.execute(
      `INSERT INTO student_logs (id, studentId, organizationId, type, date, time, description, severity, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, studentId, user.organizationId, type, date, time, description, severity || 'normal', user.id]
    );

    const logs = await db.query<StudentLog>(`SELECT * FROM student_logs WHERE id = ?`, [id]);
    return NextResponse.json({ log: logs[0] });
  } catch (error) {
    console.error('Create student log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update student log
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body = await request.json();
    const { id, type, date, time, description, severity } = body;

    if (!id) {
      return NextResponse.json({ error: 'Log ID required' }, { status: 400 });
    }

    await db.execute(
      `UPDATE student_logs SET type = ?, date = ?, time = ?, description = ?, severity = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ? AND organizationId = ?`,
      [type, date, time, description, severity, id, user.organizationId]
    );

    const logs = await db.query<StudentLog>(`SELECT * FROM student_logs WHERE id = ?`, [id]);
    return NextResponse.json({ log: logs[0] });
  } catch (error) {
    console.error('Update student log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete student log
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Log ID required' }, { status: 400 });
    }

    await db.execute(
      `DELETE FROM student_logs WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete student log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
