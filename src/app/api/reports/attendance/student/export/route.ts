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
<w:tcPr><w:tcW w:w="2000" w:type="dxa"/></w:tcPr>
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

// Get individual student attendance report as DOCX or Excel
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
    const format = searchParams.get('format') || 'docx';

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
      avertissements: number;
      miseAPied: number;
    }>(
      `SELECT s.id, s.fullName, s.email, s.phone, g.name as groupName, 
              s.currentYear, s.avertissements, s.miseAPied
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
    const rate = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;

    const monthLabel = month && month !== 'all' 
      ? new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : 'Toute l\'année';

    if (format === 'xlsx') {
      // Generate Excel (CSV format that Excel can open)
      const rows = [
        ['Rapport de Présence Étudiant'],
        [''],
        ['Étudiant', student.fullName],
        ['Groupe', student.groupName || 'Non assigné'],
        ['Email', student.email || '-'],
        ['Téléphone', student.phone || '-'],
        ['Année', student.currentYear === 1 ? '1ère Année' : '2ème Année'],
        ['Période', monthLabel],
        [''],
        ['Résumé'],
        ['Présences', summary.present.toString()],
        ['Absences', summary.absent.toString()],
        ['Retards', summary.late.toString()],
        ['Excusé', summary.excused.toString()],
        ['Taux de présence', `${rate}%`],
        [''],
        ['Détail des présences'],
        ['Date', 'Statut', 'Séance', 'Notes'],
        ...attendance.map(att => [
          att.date,
          att.status === 'PRESENT' ? 'Présent' : att.status === 'ABSENT' ? 'Absent' : att.status === 'LATE' ? 'Retard' : 'Excusé',
          att.session || '-',
          att.notes || ''
        ])
      ];

      const csvContent = rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const BOM = '\uFEFF';
      return new NextResponse(BOM + csvContent, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8;',
          'Content-Disposition': `attachment; filename="presence_${student.fullName.replace(/\s+/g, '_')}_${month || 'all'}.csv"`
        }
      });
    }

    // Generate DOCX
    let docContent = '';
    
    // Title
    docContent += createParagraph('RAPPORT DE PRÉSENCE', true, 32);
    docContent += createParagraph('', false, 12);
    
    // Student info
    docContent += createParagraph(`Étudiant: ${student.fullName}`, true, 24);
    docContent += createParagraph(`Groupe: ${student.groupName || 'Non assigné'}`, false, 22);
    docContent += createParagraph(`Email: ${student.email || '-'}`, false, 22);
    docContent += createParagraph(`Téléphone: ${student.phone || '-'}`, false, 22);
    docContent += createParagraph(`Année: ${student.currentYear === 1 ? '1ère Année' : '2ème Année'}`, false, 22);
    docContent += createParagraph(`Période: ${monthLabel}`, false, 22);
    docContent += createParagraph('', false, 12);
    
    // Summary
    docContent += createParagraph('RÉSUMÉ', true, 26);
    docContent += createParagraph(`Présences: ${summary.present}`, false, 22);
    docContent += createParagraph(`Absences: ${summary.absent}`, false, 22);
    docContent += createParagraph(`Retards: ${summary.late}`, false, 22);
    docContent += createParagraph(`Excusé: ${summary.excused}`, false, 22);
    docContent += createParagraph(`Taux de présence: ${rate}%`, true, 22);
    docContent += createParagraph('', false, 12);
    
    // Avertissements
    if (student.avertissements > 0) {
      docContent += createParagraph(`Avertissements: ${student.avertissements}`, false, 22);
    }
    
    // Attendance table
    if (attendance.length > 0) {
      docContent += createParagraph('', false, 12);
      docContent += createParagraph('DÉTAIL DES PRÉSENCES', true, 26);
      docContent += createParagraph('', false, 12);
      
      // Table header
      docContent += `<w:tbl>`;
      docContent += createTableRow(['Date', 'Statut', 'Séance', 'Notes'], true);
      
      for (const att of attendance) {
        const statusLabel = att.status === 'PRESENT' ? 'Présent' : 
                           att.status === 'ABSENT' ? 'Absent' : 
                           att.status === 'LATE' ? 'Retard' : 'Excusé';
        docContent += createTableRow([att.date, statusLabel, att.session || '-', att.notes || '-']);
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
        'Content-Disposition': `attachment; filename="presence_${student.fullName.replace(/\s+/g, '_')}_${month || 'all'}.docx`
      }
    });
  } catch (error) {
    console.error('Get student attendance report error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
