export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface ScheduleEvent {
  id: string;
  organizationId: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  courseId: string | null;
  teacherId: string | null;
  classroomId: string | null;
  groupId: string | null;
  notes: string | null;
  courseName: string | null;
  teacherName: string | null;
  groupName: string | null;
  classroomName: string | null;
}

// Get schedule events
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ schedule: [] });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const groupId = searchParams.get('groupId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let sql = `SELECT s.*, 
               c.name as courseName, 
               t.fullName as teacherName, 
               g.name as groupName,
               cl.name as classroomName
               FROM schedule s
               LEFT JOIN courses c ON s.courseId = c.id
               LEFT JOIN teachers t ON s.teacherId = t.id
               LEFT JOIN groups g ON s.groupId = g.id
               LEFT JOIN classrooms cl ON s.classroomId = cl.id
               WHERE s.organizationId = ?`;
    const args: any[] = [user.organizationId];

    if (date) {
      sql += ` AND s.date = ?`;
      args.push(date);
    }

    if (groupId) {
      sql += ` AND s.groupId = ?`;
      args.push(groupId);
    }

    if (startDate && endDate) {
      sql += ` AND s.date BETWEEN ? AND ?`;
      args.push(startDate, endDate);
    }

    sql += ` ORDER BY s.date, s.startTime`;

    const rows = await db.query<ScheduleEvent>(sql, args);

    const schedule = rows.map(row => ({
      id: row.id,
      date: row.date,
      startTime: row.startTime,
      endTime: row.endTime,
      timeSlot: row.startTime && row.endTime ? `${row.startTime} - ${row.endTime}` : '',
      courseId: row.courseId,
      courseName: row.courseName || 'Cours non assigné',
      teacherId: row.teacherId,
      teacherName: row.teacherName,
      groupId: row.groupId,
      groupName: row.groupName || 'Groupe non assigné',
      classroomId: row.classroomId,
      classroomName: row.classroomName,
      notes: row.notes,
    }));

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Get schedule error:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Create schedule event
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { date, startTime, endTime, courseId, teacherId, classroomId, groupId, notes } = body;

    if (!date) {
      return NextResponse.json({ error: 'La date est requise' }, { status: 400 });
    }

    const id = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    await db.execute(
      `INSERT INTO schedule (id, organizationId, date, startTime, endTime, courseId, teacherId, classroomId, groupId, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, user.organizationId, date, startTime || null, endTime || null, courseId || null, teacherId || null, classroomId || null, groupId || null, notes || null]
    );

    // Fetch created event
    const result = await db.query<ScheduleEvent>(
      `SELECT s.*, 
       c.name as courseName, 
       t.fullName as teacherName, 
       g.name as groupName,
       cl.name as classroomName
       FROM schedule s
       LEFT JOIN courses c ON s.courseId = c.id
       LEFT JOIN teachers t ON s.teacherId = t.id
       LEFT JOIN groups g ON s.groupId = g.id
       LEFT JOIN classrooms cl ON s.classroomId = cl.id
       WHERE s.id = ?`,
      [id]
    );

    const event = result[0];

    return NextResponse.json({
      schedule: {
        id: event.id,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        timeSlot: event.startTime && event.endTime ? `${event.startTime} - ${event.endTime}` : '',
        courseName: event.courseName || 'Cours non assigné',
        teacherName: event.teacherName,
        groupName: event.groupName || 'Groupe non assigné',
        classroomName: event.classroomName,
        notes: event.notes,
      }
    });
  } catch (error) {
    console.error('Create schedule error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}

// Delete schedule event
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    // Verify ownership
    const check = await db.query<{ id: string }>(
      `SELECT id FROM schedule WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 });
    }

    await db.execute(`DELETE FROM schedule WHERE id = ?`, [id]);

    return NextResponse.json({ message: 'Événement supprimé' });
  } catch (error) {
    console.error('Delete schedule error:', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
