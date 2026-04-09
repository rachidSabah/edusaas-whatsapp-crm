export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface ArchivedStudent {
  id: string;
  organizationId: string;
  originalStudentId: string;
  studentName: string;
  studentEmail: string | null;
  studentPhone: string | null;
  groupName: string | null;
  academicYears: string | null;
  coursesCompleted: string | null;
  attendanceSummary: string | null;
  graduationDate: string;
  createdAt: string;
}

// Get archived students
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ archivedStudents: [] });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    let sql = `SELECT * FROM graduated_students_archive WHERE organizationId = ?`;
    const args: any[] = [user.organizationId];

    if (search) {
      sql += ` AND (studentName LIKE ? OR studentEmail LIKE ? OR groupName LIKE ?)`;
      const searchPattern = `%${search}%`;
      args.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY graduationDate DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const archivedStudents = await db.query<ArchivedStudent>(sql, args);

    // Get total count
    let countSql = `SELECT COUNT(*) as count FROM graduated_students_archive WHERE organizationId = ?`;
    const countArgs: any[] = [user.organizationId];

    if (search) {
      countSql += ` AND (studentName LIKE ? OR studentEmail LIKE ? OR groupName LIKE ?)`;
      const searchPattern = `%${search}%`;
      countArgs.push(searchPattern, searchPattern, searchPattern);
    }

    const countRows = await db.query<{ count: number }>(countSql, countArgs);
    const total = countRows[0]?.count || 0;

    return NextResponse.json({
      archivedStudents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get archived students error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Graduate students (move to archive)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body = await request.json() as { studentIds?: string[]; graduationDate?: string };
    const { studentIds, graduationDate } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Les IDs des étudiants sont requis' }, { status: 400 });
    }

    const graduationDateValue = graduationDate || new Date().toISOString().split('T')[0];
    const results = { archived: 0, errors: 0 };

    for (const studentId of studentIds) {
      try {
        // Get student data
        const students = await db.query<{
          id: string;
          fullName: string;
          email: string | null;
          phone: string | null;
          groupId: string | null;
        }>(
          `SELECT id, fullName, email, phone, groupId FROM students WHERE id = ? AND organizationId = ?`,
          [studentId, user.organizationId]
        );

        if (students.length === 0) {
          results.errors++;
          continue;
        }

        const student = students[0];

        // Get group name
        let groupName = null;
        if (student.groupId) {
          const groups = await db.query<{ name: string }>(
            `SELECT name FROM groups WHERE id = ?`,
            [student.groupId]
          );
          groupName = groups[0]?.name || null;
        }

        // Get attendance summary
        const attendance = await db.query<{ present: number; absent: number; late: number }>(
          `SELECT 
            SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absent,
            SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) as late
           FROM attendance WHERE studentId = ?`,
          [studentId]
        );

        const attendanceSummary = JSON.stringify(attendance[0] || { present: 0, absent: 0, late: 0 });

        // Create archive record
        const archiveId = `archive_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        await db.execute(
          `INSERT INTO graduated_students_archive 
           (id, organizationId, originalStudentId, studentName, studentEmail, studentPhone, 
            groupName, attendanceSummary, graduationDate)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [archiveId, user.organizationId, studentId, student.fullName, 
           student.email, student.phone, groupName, attendanceSummary, graduationDateValue]
        );

        // Mark student as graduated (soft delete)
        await db.execute(
          `UPDATE students SET status = 'GRADUATED', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          [studentId]
        );

        results.archived++;
      } catch (err) {
        console.error(`Error archiving student ${studentId}:`, err);
        results.errors++;
      }
    }

    return NextResponse.json({
      message: `${results.archived} étudiants diplômés avec succès`,
      ...results,
    });
  } catch (error) {
    console.error('Graduate students error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
