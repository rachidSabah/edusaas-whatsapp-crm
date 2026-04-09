export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface ScheduleBatch {
  id: string;
  organizationId: string;
  date: string;
  timeSlot: string | null;
  courseId: string | null;
  teacherId: string | null;
  classroomId: string | null;
  groupId: string | null;
  notes: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
  courseName?: string;
  teacherName?: string;
  classroomName?: string;
  groupName?: string;
}

// Get group schedules
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ schedules: [] });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    let sql = `
      SELECT s.*, 
        c.name as courseName,
        t.name as teacherName,
        cl.name as classroomName,
        g.name as groupName
      FROM schedule s
      LEFT JOIN courses c ON s.courseId = c.id
      LEFT JOIN teachers t ON s.teacherId = t.id
      LEFT JOIN classrooms cl ON s.classroomId = cl.id
      LEFT JOIN groups g ON s.groupId = g.id
      WHERE s.organizationId = ? AND s.groupId = ? AND s.isActive = 1
    `;
    const args: any[] = [user.organizationId, groupId];

    if (startDate) {
      sql += ` AND s.date >= ?`;
      args.push(startDate);
    }

    if (endDate) {
      sql += ` AND s.date <= ?`;
      args.push(endDate);
    }

    sql += ` ORDER BY s.date ASC, s.timeSlot ASC`;

    const schedules = await db.query<ScheduleBatch>(sql, args);
    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Get group schedule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create batch schedule entries for a date range
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body = await request.json();
    const { 
      groupId, 
      startDate, 
      endDate, 
      courseId, 
      teacherId, 
      classroomId, 
      timeSlot,
      daysOfWeek, // Array of day numbers (0=Sunday, 1=Monday, etc.)
      notes 
    } = body;

    if (!groupId || !startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Group ID, start date, and end date are required' 
      }, { status: 400 });
    }

    // Verify group belongs to organization
    const groupCheck = await db.query<{ id: string; name: string }>(
      `SELECT id, name FROM groups WHERE id = ? AND organizationId = ?`,
      [groupId, user.organizationId]
    );

    if (groupCheck.length === 0) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Generate dates within the range
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    while (start <= end) {
      const dayOfWeek = start.getDay();
      // If daysOfWeek is specified, only include those days
      if (!daysOfWeek || daysOfWeek.length === 0 || daysOfWeek.includes(dayOfWeek)) {
        dates.push(start.toISOString().split('T')[0]);
      }
      start.setDate(start.getDate() + 1);
    }

    if (dates.length === 0) {
      return NextResponse.json({ 
        error: 'No valid dates in the selected range',
        schedules: [],
        createdCount: 0
      });
    }

    // Create schedule entries for each date
    const createdSchedules: ScheduleBatch[] = [];
    
    for (const date of dates) {
      const id = `sched_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      await db.execute(
        `INSERT INTO schedule (id, organizationId, date, timeSlot, courseId, teacherId, classroomId, groupId, notes, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [id, user.organizationId, date, timeSlot || null, courseId || null, 
         teacherId || null, classroomId || null, groupId, notes || null]
      );

      // Fetch the created schedule
      const schedule = await db.query<ScheduleBatch>(
        `SELECT s.*, c.name as courseName, t.name as teacherName, cl.name as classroomName, g.name as groupName
         FROM schedule s
         LEFT JOIN courses c ON s.courseId = c.id
         LEFT JOIN teachers t ON s.teacherId = t.id
         LEFT JOIN classrooms cl ON s.classroomId = cl.id
         LEFT JOIN groups g ON s.groupId = g.id
         WHERE s.id = ?`,
        [id]
      );

      if (schedule[0]) {
        createdSchedules.push(schedule[0]);
      }
    }

    return NextResponse.json({ 
      message: `${createdSchedules.length} séances créées avec succès`,
      schedules: createdSchedules,
      createdCount: createdSchedules.length
    });
  } catch (error) {
    console.error('Create batch schedule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete all schedules for a group in a date range
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    let sql = `UPDATE schedule SET isActive = 0 WHERE organizationId = ? AND groupId = ?`;
    const args: any[] = [user.organizationId, groupId];

    if (startDate) {
      sql += ` AND date >= ?`;
      args.push(startDate);
    }

    if (endDate) {
      sql += ` AND date <= ?`;
      args.push(endDate);
    }

    await db.execute(sql, args);
    
    return NextResponse.json({ message: 'Schedules deleted successfully' });
  } catch (error) {
    console.error('Delete group schedule error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
