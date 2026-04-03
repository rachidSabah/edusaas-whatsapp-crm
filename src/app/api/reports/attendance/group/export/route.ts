export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

// Generate DOCX content (simple XML-based approach)
function generateDocx(content: string): Uint8Array {
  const docTemplate = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${content}
</w:body>
</w:document>`;

  return new TextEncoder().encode(docTemplate);
}

// Create a paragraph element
function createParagraph(text: string, bold: boolean = false, size: number = 24): string {
  return `<w:p>
<w:pPr>
<w:jc w:val="left"/>
</w:pPr>
<w:r>
<w:rPr>
<w:sz w:val="${size}"/>
${bold ? '<w:b/>' : ''}
</w:rPr>
<w:t>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t>
</w:r>
</w:p>`;
}

// Create a table row
function createTableRow(cells: string[], isHeader: boolean = false): string {
  const cellContent = cells.map(cell => 
    `<w:tc>
<w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr>
<w:p>
<w:r>
<w:rPr>${isHeader ? '<w:b/>' : ''}</w:rPr>
<w:t>${cell.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t>
</w:r>
</w:p>
</w:tc>`
  ).join('');
  
  return `<w:tr>${cellContent}</w:tr>`;
}

// Get group attendance report as DOCX or Excel
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const month = searchParams.get('month');
    const format = searchParams.get('format') || 'xlsx';

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Get group info
    const groups = await db.query<{ 
      id: string; 
      name: string;
      currentYear: number;
    }>(
      `SELECT id, name, currentYear
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
    const args: any[] = [groupId];

    if (month && month !== 'all') {
      dateFilter = ` AND strftime('%Y-%m', date) = ?`;
      args.push(month);
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
      args
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

      const total = present + absent + late + excused;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        studentId: student.id,
        studentName: student.fullName,
        currentYear: student.currentYear,
        avertissements: student.avertissements,
        miseAPied: student.miseAPied,
        attendance: studentAttendance,
        summary: { present, absent, late, excused, rate }
      };
    });

    // Group summary
    const totalPossibleAttendance = students.length * dates.length;
    const avgRate = totalPossibleAttendance > 0
      ? Math.round(
          (attendanceMatrix.reduce((sum, s) => sum + s.summary.present, 0) / 
          totalPossibleAttendance) * 100
        )
      : 0;

    const monthLabel = month && month !== 'all' 
      ? new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : 'Toute l\'année';

    if (format === 'xlsx') {
      // Generate Excel (CSV format that Excel can open - landscape layout)
      const rows = [
        ['Rapport de Présence de Groupe'],
        [''],
        ['Groupe', group.name],
        ['Année', group.currentYear === 1 ? '1ère Année' : '2ème Année'],
        ['Période', monthLabel],
        ['Nombre d\'étudiants', students.length.toString()],
        ['Jours analysés', dates.length.toString()],
        ['Présence moyenne', `${avgRate}%`],
        [''],
        ['Détail par étudiant'],
        ['Étudiant', 'Année', 'Présences', 'Absences', 'Retards', 'Excusé', 'Taux', 'Avertissements', 'Mise à pied'],
        ...attendanceMatrix.map(student => [
          student.studentName,
          student.currentYear === 1 ? '1ère' : '2ème',
          student.summary.present.toString(),
          student.summary.absent.toString(),
          student.summary.late.toString(),
          student.summary.excused.toString(),
          `${student.summary.rate}%`,
          student.avertissements.toString(),
          student.miseAPied > 0 ? 'Oui' : 'Non'
        ])
      ];

      const csvContent = rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const BOM = '\uFEFF';
      return new NextResponse(BOM + csvContent, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8;',
          'Content-Disposition': `attachment; filename="presence_groupe_${group.name.replace(/\s+/g, '_')}_${month || 'all'}.csv`
        }
      });
    }

    // Generate DOCX (portrait A4)
    let docContent = '';
    
    // Title
    docContent += createParagraph('RAPPORT DE PRÉSENCE DE GROUPE', true, 32);
    docContent += createParagraph('', false, 12);
    
    // Group info
    docContent += createParagraph(`Groupe: ${group.name}`, true, 24);
    docContent += createParagraph(`Année: ${group.currentYear === 1 ? '1ère Année' : '2ème Année'}`, false, 22);
    docContent += createParagraph(`Période: ${monthLabel}`, false, 22);
    docContent += createParagraph(`Nombre d'étudiants: ${students.length}`, false, 22);
    docContent += createParagraph(`Jours analysés: ${dates.length}`, false, 22);
    docContent += createParagraph(`Présence moyenne: ${avgRate}%`, true, 22);
    docContent += createParagraph('', false, 12);
    
    // Attendance table
    if (attendanceMatrix.length > 0) {
      docContent += createParagraph('DÉTAIL PAR ÉTUDIANT', true, 26);
      docContent += createParagraph('', false, 12);
      
      // Table header
      docContent += `<w:tbl>`;
      docContent += createTableRow(['Étudiant', 'Prés.', 'Abs.', 'Ret.', 'Exc.', 'Taux'], true);
      
      for (const student of attendanceMatrix) {
        docContent += createTableRow([
          student.studentName,
          student.summary.present.toString(),
          student.summary.absent.toString(),
          student.summary.late.toString(),
          student.summary.excused.toString(),
          `${student.summary.rate}%`
        ]);
      }
      
      docContent += `</w:tbl>`;
    }
    
    // Footer
    docContent += createParagraph('', false, 12);
    docContent += createParagraph(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, false, 20);

    const docxContent = generateDocx(docContent);

    return new NextResponse(docxContent, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="presence_groupe_${group.name.replace(/\s+/g, '_')}_${month || 'all'}.docx`
      }
    });
  } catch (error) {
    console.error('Get group attendance report error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
