import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface StudentLog {
  id: string;
  studentId: string;
  organizationId: string;
  type: string;
  category: string;
  date: string;
  time: string;
  description: string;
  severity: string;
  status: string;
  actionTaken: string | null;
  followUpRequired: number;
  followUpDate: string | null;
  followUpNotes: string | null;
  reportedByName: string | null;
  witnessNames: string | null;
  location: string | null;
  parentNotified: number;
  parentNotifiedAt: string | null;
  parentNotifiedBy: string | null;
  resolution: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  attachments: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface LogWithStudent extends StudentLog {
  studentName?: string;
  studentGroupId?: string;
  groupName?: string;
}

// Get student logs - can filter by studentId or get all for organization
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ logs: [] });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');

    let query = `
      SELECT sl.*, 
        s.fullName as studentName, 
        s.groupId as studentGroupId,
        g.name as groupName
      FROM student_logs sl
      LEFT JOIN students s ON sl.studentId = s.id
      LEFT JOIN groups g ON s.groupId = g.id
      WHERE sl.organizationId = ?
    `;
    const params: any[] = [user.organizationId];

    if (studentId) {
      query += ` AND sl.studentId = ?`;
      params.push(studentId);
    }
    if (type) {
      query += ` AND sl.type = ?`;
      params.push(type);
    }
    if (status) {
      query += ` AND sl.status = ?`;
      params.push(status);
    }
    if (severity) {
      query += ` AND sl.severity = ?`;
      params.push(severity);
    }

    query += ` ORDER BY sl.date DESC, sl.time DESC`;

    const logs = await db.query<LogWithStudent>(query, params);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Get student logs error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
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
    const {
      studentId,
      type = 'incident',
      category = 'general',
      date,
      time,
      description,
      severity = 'normal',
      status = 'open',
      actionTaken,
      followUpRequired = false,
      followUpDate,
      followUpNotes,
      reportedByName,
      witnessNames,
      location,
      parentNotified = false,
      attachments,
    } = body;

    if (!studentId || !date || !time || !description) {
      return NextResponse.json({ error: 'Student ID, date, time, and description are required' }, { status: 400 });
    }

    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO student_logs (
        id, studentId, organizationId, type, category, date, time, description, severity, status,
        actionTaken, followUpRequired, followUpDate, followUpNotes, reportedByName, witnessNames,
        location, parentNotified, attachments, createdBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, studentId, user.organizationId, type, category, date, time, description, severity, status,
        actionTaken || null, followUpRequired ? 1 : 0, followUpDate || null, followUpNotes || null,
        reportedByName || null, witnessNames || null, location || null, parentNotified ? 1 : 0,
        attachments || null, user.id, now, now
      ]
    );

    const logs = await db.query<LogWithStudent>(
      `SELECT sl.*, s.fullName as studentName, g.name as groupName
       FROM student_logs sl
       LEFT JOIN students s ON sl.studentId = s.id
       LEFT JOIN groups g ON s.groupId = g.id
       WHERE sl.id = ?`,
      [id]
    );

    return NextResponse.json({ log: logs[0] });
  } catch (error) {
    console.error('Create student log error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
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
    const {
      id,
      type,
      category,
      date,
      time,
      description,
      severity,
      status,
      actionTaken,
      followUpRequired,
      followUpDate,
      followUpNotes,
      reportedByName,
      witnessNames,
      location,
      parentNotified,
      parentNotifiedAt,
      parentNotifiedBy,
      resolution,
      resolvedAt,
      resolvedBy,
      attachments,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Log ID required' }, { status: 400 });
    }

    // Build dynamic update
    const updates: string[] = [];
    const params: any[] = [];

    if (type !== undefined) { updates.push('type = ?'); params.push(type); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }
    if (date !== undefined) { updates.push('date = ?'); params.push(date); }
    if (time !== undefined) { updates.push('time = ?'); params.push(time); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (severity !== undefined) { updates.push('severity = ?'); params.push(severity); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (actionTaken !== undefined) { updates.push('actionTaken = ?'); params.push(actionTaken || null); }
    if (followUpRequired !== undefined) { updates.push('followUpRequired = ?'); params.push(followUpRequired ? 1 : 0); }
    if (followUpDate !== undefined) { updates.push('followUpDate = ?'); params.push(followUpDate || null); }
    if (followUpNotes !== undefined) { updates.push('followUpNotes = ?'); params.push(followUpNotes || null); }
    if (reportedByName !== undefined) { updates.push('reportedByName = ?'); params.push(reportedByName || null); }
    if (witnessNames !== undefined) { updates.push('witnessNames = ?'); params.push(witnessNames || null); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location || null); }
    if (parentNotified !== undefined) { updates.push('parentNotified = ?'); params.push(parentNotified ? 1 : 0); }
    if (parentNotifiedAt !== undefined) { updates.push('parentNotifiedAt = ?'); params.push(parentNotifiedAt || null); }
    if (parentNotifiedBy !== undefined) { updates.push('parentNotifiedBy = ?'); params.push(parentNotifiedBy || null); }
    if (resolution !== undefined) { updates.push('resolution = ?'); params.push(resolution || null); }
    if (resolvedAt !== undefined) { updates.push('resolvedAt = ?'); params.push(resolvedAt || null); }
    if (resolvedBy !== undefined) { updates.push('resolvedBy = ?'); params.push(resolvedBy || null); }
    if (attachments !== undefined) { updates.push('attachments = ?'); params.push(attachments || null); }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(id, user.organizationId);

    await db.execute(
      `UPDATE student_logs SET ${updates.join(', ')} WHERE id = ? AND organizationId = ?`,
      params
    );

    const logs = await db.query<LogWithStudent>(
      `SELECT sl.*, s.fullName as studentName, g.name as groupName
       FROM student_logs sl
       LEFT JOIN students s ON sl.studentId = s.id
       LEFT JOIN groups g ON s.groupId = g.id
       WHERE sl.id = ?`,
      [id]
    );

    return NextResponse.json({ log: logs[0] });
  } catch (error) {
    console.error('Update student log error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
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
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
