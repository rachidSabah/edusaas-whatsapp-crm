export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

// Get group attendance report
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ report: null });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const month = searchParams.get('month'); // Format: YYYY-MM
    const exportCsv = searchParams.get('export') === 'csv';

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Get group info
    const groups = await db.query<{ 
      id: string; 
      name: string;
      currentYear: number;
      year1StartDate: string | null;
      year1EndDate: string | null;
      year2StartDate: string | null;
      year2EndDate: string | null;
    }>(
      `SELECT id, name, currentYear, year1StartDate, year1EndDate, year2StartDate, year2EndDate 
       FROM groups WHERE id = ? AND organizationId = ?`,
      [groupId, user.organizationId]
    );

    if (groups.length === 0) {
      return NextResponse.json({ error: 'Groupe non trouvé' }, { status: 404 });
    }

    const group = groups[0];

    // Get students in group
    const students = await db.query<{ 
      id: string; 
      fullName: string;
      currentYear: number;
      avertissements: number;
      miseAPied: number;
    }>(
      `SELECT id, fullName, currentYear, avertissements, miseAPied 
       FROM students WHERE groupId = ? AND status = 'ACTIVE' ORDER BY fullName`,
      [groupId]
    );

    // Build date filter
    let dateFilter = '';
    const baseArgs: any[] = [groupId];

    if (month && month !== 'all') {
      dateFilter = ` AND strftime('%Y-%m', date) = ?`;
      baseArgs.push(month);
    }

    // Get all attendance for the group in the period
    const allAttendance = await db.query<{
      studentId: string;
      date: string;
      status: string;
    }>(
      `SELECT studentId, date, status
       FROM attendance
       WHERE groupId = ?${dateFilter}
       ORDER BY date ASC`,
      baseArgs
    );

    // Get unique dates
    const dates = [...new Set(allAttendance.map(a => a.date))].sort();

    // Build attendance matrix
    const attendanceMatrix = students.map(student => {
      const studentAttendance: Record<string, string> = {};
      let present = 0, absent = 0, late = 0, excused = 0;

      for (const att of allAttendance) {
        if (att.studentId === student.id) {
          studentAttendance[att.date] = att.status;
          if (att.status === 'PRESENT') present++;
          else if (att.status === 'ABSENT') absent++;
          else if (att.status === 'LATE') late++;
          else if (att.status === 'EXCUSED') excused++;
        }
      }

      return {
        studentId: student.id,
        studentName: student.fullName,
        currentYear: student.currentYear,
        avertissements: student.avertissements,
        miseAPied: student.miseAPied,
        attendance: studentAttendance,
        summary: { present, absent, late, excused },
      };
    });

    // Group summary
    const totalPossibleAttendance = students.length * dates.length;
    const groupSummary = {
      totalStudents: students.length,
      totalDays: dates.length,
      averageAttendance: totalPossibleAttendance > 0
        ? Math.round(
            (attendanceMatrix.reduce((sum, s) => sum + s.summary.present, 0) / 
            totalPossibleAttendance) * 100
          )
        : 0,
    };

    const report = {
      group,
      month,
      dates,
      attendanceMatrix,
      groupSummary,
    };

    // Handle CSV export
    if (exportCsv) {
      const headers = ['Étudiant', 'Année', 'Présences', 'Absences', 'Retards', 'Excusé', 'Taux', 'Avertissements', 'Mise à pied'];
      const rows = attendanceMatrix.map(student => {
        const total = student.summary.present + student.summary.absent + student.summary.late + student.summary.excused;
        const rate = total > 0 ? Math.round((student.summary.present / total) * 100) : 0;
        return [
          student.studentName,
          student.currentYear === 1 ? '1ère Année' : '2ème Année',
          student.summary.present.toString(),
          student.summary.absent.toString(),
          student.summary.late.toString(),
          student.summary.excused.toString(),
          `${rate}%`,
          student.avertissements.toString(),
          student.miseAPied > 0 ? 'Oui' : 'Non'
        ];
      });

      // Add summary
      rows.push([]);
      rows.push(['Résumé du groupe']);
      rows.push(['Total étudiants', groupSummary.totalStudents.toString()]);
      rows.push(['Jours analysés', groupSummary.totalDays.toString()]);
      rows.push(['Présence moyenne', `${groupSummary.averageAttendance}%`]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const BOM = '\uFEFF';
      return new NextResponse(BOM + csvContent, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8;',
          'Content-Disposition': `attachment; filename="presence_groupe_${group.name.replace(/\s+/g, '_')}_${month || 'all'}.csv"`
        }
      });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Get group attendance report error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
