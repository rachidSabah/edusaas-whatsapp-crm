export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
         WidthType, AlignmentType, BorderStyle, HeadingLevel } from 'docx';

interface AttendanceRecord {
  date: string;
  status: string;
  notes: string | null;
  groupName: string | null;
}

interface StudentInfo {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  program: string | null;
  groupName: string | null;
}

interface MonthStats {
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  LATE: 'Retard',
  EXCUSED: 'Excusé',
};

// Generate individual student attendance report
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const month = searchParams.get('month');
    const groupId = searchParams.get('groupId');

    if (!studentId && !groupId) {
      return NextResponse.json({ error: 'studentId ou groupId requis' }, { status: 400 });
    }

    // Get organization info
    const orgResult = await db.query<{ name: string }>(
      `SELECT name FROM organizations WHERE id = ?`,
      [user.organizationId]
    );
    const orgName = orgResult[0]?.name || 'Établissement';

    // Individual report
    if (studentId) {
      return await generateIndividualReport(db, user.organizationId, studentId, month, orgName);
    }

    // Group report
    if (groupId) {
      return await generateGroupReport(db, user.organizationId, groupId, month, orgName);
    }

    return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération du rapport' }, { status: 500 });
  }
}

async function generateIndividualReport(
  db: ReturnType<typeof getDbContext>,
  organizationId: string,
  studentId: string,
  month: string | null,
  orgName: string
) {
  // Get student info
  const students = await db.query<StudentInfo>(
    `SELECT s.fullName, s.firstName, s.lastName, s.email, s.phone, s.program, g.name as groupName
     FROM students s
     LEFT JOIN groups g ON s.groupId = g.id
     WHERE s.id = ? AND s.organizationId = ?`,
    [studentId, organizationId]
  );

  if (students.length === 0) {
    return NextResponse.json({ error: 'Étudiant non trouvé' }, { status: 404 });
  }

  const student = students[0];

  // Get attendance records
  let dateFilter = '';
  const args: any[] = [organizationId, studentId];

  if (month) {
    dateFilter = ` AND strftime('%Y-%m', a.date) = ?`;
    args.push(month);
  }

  const records = await db.query<AttendanceRecord>(
    `SELECT a.date, a.status, a.notes, g.name as groupName
     FROM attendance a
     LEFT JOIN groups g ON a.groupId = g.id
     WHERE a.organizationId = ? AND a.studentId = ?${dateFilter}
     ORDER BY a.date DESC`,
    args
  );

  // Calculate statistics
  const stats: MonthStats = {
    totalDays: records.length,
    present: records.filter(r => r.status === 'PRESENT').length,
    absent: records.filter(r => r.status === 'ABSENT').length,
    late: records.filter(r => r.status === 'LATE').length,
    excused: records.filter(r => r.status === 'EXCUSED').length,
  };

  const reportMonth = month ? `${MONTHS_FR[parseInt(month.split('-')[1]) - 1]} ${month.split('-')[0]}` : 'Toutes les dates';

  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: orgName, bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: 'RAPPORT DE PRÉSENCE INDIVIDUEL', bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Informations de l\'étudiant', bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Nom complet: ', bold: true }),
            new TextRun(student.fullName),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Groupe: ', bold: true }),
            new TextRun(student.groupName || 'Non assigné'),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Programme: ', bold: true }),
            new TextRun(student.program || 'Non spécifié'),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Email: ', bold: true }),
            new TextRun(student.email || 'Non spécifié'),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Téléphone: ', bold: true }),
            new TextRun(student.phone || 'Non spécifié'),
          ],
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Période: ', bold: true }),
            new TextRun(reportMonth),
          ],
          spacing: { after: 300 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Récapitulatif', bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [createTableCell('Jours enregistrés', true), createTableCell(stats.totalDays.toString())] }),
            new TableRow({ children: [createTableCell('Présences', true), createTableCell(stats.present.toString())] }),
            new TableRow({ children: [createTableCell('Absences', true), createTableCell(stats.absent.toString())] }),
            new TableRow({ children: [createTableCell('Retards', true), createTableCell(stats.late.toString())] }),
            new TableRow({ children: [createTableCell('Excusés', true), createTableCell(stats.excused.toString())] }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Détail des présences', bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        }),
        records.length > 0 ? new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [createTableCell('Date', true), createTableCell('Statut', true), createTableCell('Notes', true)] }),
            ...records.map(record => new TableRow({
              children: [
                createTableCell(formatDate(record.date)),
                createTableCell(STATUS_LABELS[record.status] || record.status),
                createTableCell(record.notes || '-'),
              ],
            })),
          ],
        }) : new Paragraph({
          children: [new TextRun({ text: 'Aucune présence enregistrée pour cette période', italics: true })],
        }),
        new Paragraph({
          children: [new TextRun({ text: `\nDocument généré le ${new Date().toLocaleDateString('fr-FR')}`, size: 20, italics: true })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 600 },
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const fileName = `presence_${student.fullName.replace(/\s+/g, '_')}_${month || 'complet'}.docx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}

async function generateGroupReport(
  db: ReturnType<typeof getDbContext>,
  organizationId: string,
  groupId: string,
  month: string | null,
  orgName: string
) {
  // Get group info
  const groups = await db.query<{ name: string }>(
    `SELECT name FROM groups WHERE id = ? AND organizationId = ?`,
    [groupId, organizationId]
  );

  if (groups.length === 0) {
    return NextResponse.json({ error: 'Groupe non trouvé' }, { status: 404 });
  }

  const groupName = groups[0].name;

  // Get students in group
  const students = await db.query<{ id: string; fullName: string }>(
    `SELECT id, fullName FROM students WHERE groupId = ? AND organizationId = ? AND status = 'ACTIVE'`,
    [groupId, organizationId]
  );

  // Get attendance for all students
  let dateFilter = '';
  const args: any[] = [organizationId, groupId];

  if (month) {
    dateFilter = ` AND strftime('%Y-%m', a.date) = ?`;
    args.push(month);
  }

  const allRecords = await db.query<{ studentId: string; date: string; status: string }>(
    `SELECT a.studentId, a.date, a.status FROM attendance a WHERE a.organizationId = ? AND a.groupId = ?${dateFilter}`,
    args
  );

  // Calculate stats per student
  const studentStats: Record<string, MonthStats> = {};
  for (const student of students) {
    studentStats[student.id] = { totalDays: 0, present: 0, absent: 0, late: 0, excused: 0 };
  }

  for (const record of allRecords) {
    if (studentStats[record.studentId]) {
      studentStats[record.studentId].totalDays++;
      if (record.status === 'PRESENT') studentStats[record.studentId].present++;
      else if (record.status === 'ABSENT') studentStats[record.studentId].absent++;
      else if (record.status === 'LATE') studentStats[record.studentId].late++;
      else if (record.status === 'EXCUSED') studentStats[record.studentId].excused++;
    }
  }

  const reportMonth = month ? `${MONTHS_FR[parseInt(month.split('-')[1]) - 1]} ${month.split('-')[0]}` : 'Toutes les dates';

  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: orgName, bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: 'RAPPORT DE PRÉSENCE - GROUPE', bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Groupe: ', bold: true }), new TextRun(groupName)],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Période: ', bold: true }), new TextRun(reportMonth)],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [new TextRun({ text: `Nombre d'étudiants: ${students.length}`, bold: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Récapitulatif par étudiant', bold: true, size: 24 })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createTableCell('Étudiant', true),
                createTableCell('Jours', true),
                createTableCell('Présent', true),
                createTableCell('Absent', true),
                createTableCell('Retard', true),
                createTableCell('Excusé', true),
                createTableCell('Taux', true),
              ],
            }),
            ...students.map(student => {
              const stats = studentStats[student.id];
              const rate = stats.totalDays > 0 ? Math.round((stats.present / stats.totalDays) * 100) : 0;
              return new TableRow({
                children: [
                  createTableCell(student.fullName),
                  createTableCell(stats.totalDays.toString()),
                  createTableCell(stats.present.toString()),
                  createTableCell(stats.absent.toString()),
                  createTableCell(stats.late.toString()),
                  createTableCell(stats.excused.toString()),
                  createTableCell(`${rate}%`),
                ],
              });
            }),
          ],
        }),
        new Paragraph({
          children: [new TextRun({ text: `\nDocument généré le ${new Date().toLocaleDateString('fr-FR')}`, size: 20, italics: true })],
          alignment: AlignmentType.RIGHT,
          spacing: { before: 600 },
        }),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const fileName = `presence_groupe_${groupName.replace(/\s+/g, '_')}_${month || 'complet'}.docx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}

function createTableCell(text: string, isHeader = false): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: isHeader, size: 22 })] })],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
