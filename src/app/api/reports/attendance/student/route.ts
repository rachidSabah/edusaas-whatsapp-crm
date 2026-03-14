export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

// Get individual student attendance report
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ report: null });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const month = searchParams.get('month'); // Format: YYYY-MM
    const exportCsv = searchParams.get('export') === 'csv';

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Get student info
    const students = await db.query<{
      id: string;
      fullName: string;
      email: string | null;
      phone: string | null;
      groupName: string | null;
      currentYear: number;
      absences: string | null;
      retards: string | null;
      avertissements: number;
      miseAPied: number;
    }>(
      `SELECT s.id, s.fullName, s.email, s.phone, g.name as groupName, 
              s.currentYear, s.absences, s.retards, s.avertissements, s.miseAPied
       FROM students s
       LEFT JOIN groups g ON s.groupId = g.id
       WHERE s.id = ? AND s.organizationId = ?`,
      [studentId, user.organizationId]
    );

    if (students.length === 0) {
      return NextResponse.json({ error: 'Étudiant non trouvé' }, { status: 404 });
    }

    const student = students[0];

    // Build date filter
    let dateFilter = '';
    const args: any[] = [studentId];

    if (month && month !== 'all') {
      dateFilter = ` AND strftime('%Y-%m', date) = ?`;
      args.push(month);
    }

    // Get attendance records
    const attendance = await db.query<{
      id: string;
      date: string;
      status: string;
      notes: string | null;
      session: string | null;
    }>(
      `SELECT id, date, status, notes, session
       FROM attendance
       WHERE studentId = ?${dateFilter}
       ORDER BY date DESC`,
      args
    );

    // Calculate summary
    const summaryResult = await db.query<{ present: number; absent: number; late: number; excused: number; total: number }>(
      `SELECT 
        SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN status = 'EXCUSED' THEN 1 ELSE 0 END) as excused,
        COUNT(*) as total
       FROM attendance
       WHERE studentId = ?${dateFilter}`,
      args
    );

    const summary = summaryResult[0] || { present: 0, absent: 0, late: 0, excused: 0, total: 0 };

    // Parse JSON fields
    const absencesList = student.absences ? JSON.parse(student.absences) : [];
    const retardsList = student.retards ? JSON.parse(student.retards) : [];

    const report = {
      student: {
        ...student,
        absences: absencesList,
        retards: retardsList,
      },
      month,
      attendance,
      summary,
    };

    // Handle CSV export
    if (exportCsv) {
      const headers = ['Date', 'Statut', 'Séance', 'Notes'];
      const rows = attendance.map(att => [
        att.date,
        att.status === 'PRESENT' ? 'Présent' : att.status === 'ABSENT' ? 'Absent' : att.status === 'LATE' ? 'Retard' : 'Excusé',
        att.session || '-',
        att.notes || ''
      ]);

      // Add summary rows
      rows.push([]);
      rows.push(['Résumé']);
      rows.push(['Présences', summary.present.toString()]);
      rows.push(['Absences', summary.absent.toString()]);
      rows.push(['Retards', summary.late.toString()]);
      rows.push(['Excusé', summary.excused.toString()]);
      rows.push(['Taux de présence', `${summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0}%`]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const BOM = '\uFEFF';
      return new NextResponse(BOM + csvContent, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8;',
          'Content-Disposition': `attachment; filename="presence_${student.fullName.replace(/\s+/g, '_')}_${month || 'all'}.csv"`
        }
      });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Get student attendance report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
