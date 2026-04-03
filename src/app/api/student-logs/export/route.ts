import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface StudentLog {
  id: string;
  type: string;
  date: string;
  time: string;
  description: string;
  severity: string;
  createdAt: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  group: string;
  enrollmentDate: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    }

    // Fetch student details
    const students = await db.query<Student>(
      `SELECT id, firstName, lastName, email, phone, enrollmentDate FROM students WHERE id = ? AND organizationId = ?`,
      [studentId, user.organizationId]
    );

    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const student = students[0];

    // Fetch student logs
    const logs = await db.query<StudentLog>(
      `SELECT * FROM student_logs WHERE studentId = ? AND organizationId = ? ORDER BY date DESC, time DESC`,
      [studentId, user.organizationId]
    );

    // Generate DOCX content
    const docxBuffer = generateDocxContent(student, logs || []);

    // Return as downloadable file
    return new NextResponse(docxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="livret_${student.firstName}_${student.lastName}_${new Date().toISOString().split('T')[0]}.docx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

function generateDocxContent(student: Student, logs: StudentLog[]): Uint8Array {
  // Create a proper DOCX structure with XML
  const now = new Date();
  const generatedDate = now.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Count incidents by type
  const incidentCounts = {
    avertissement: logs.filter(l => l.type === 'avertissement').length,
    incident: logs.filter(l => l.type === 'incident').length,
    mise_a_pied: logs.filter(l => l.type === 'mise_a_pied').length,
    termination: logs.filter(l => l.type === 'termination').length,
  };

  const logsXml = logs
    .map((log, index) => {
      const typeLabel = getTypeLabel(log.type);
      const severityLabel = log.severity.charAt(0).toUpperCase() + log.severity.slice(1);
      
      return `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9144" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="12" w:space="0" w:color="CCCCCC"/>
          <w:left w:val="single" w:sz="12" w:space="0" w:color="CCCCCC"/>
          <w:bottom w:val="single" w:sz="12" w:space="0" w:color="CCCCCC"/>
          <w:right w:val="single" w:sz="12" w:space="0" w:color="CCCCCC"/>
          <w:insideH w:val="single" w:sz="12" w:space="0" w:color="CCCCCC"/>
          <w:insideV w:val="single" w:sz="12" w:space="0" w:color="CCCCCC"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:trPr>
          <w:trHeight w:val="400" w:type="atLeast"/>
        </w:trPr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
            <w:shd w:fill="E8E8E8"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:pStyle w:val="TableParagraph"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>Type</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
            <w:shd w:fill="E8E8E8"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:pStyle w:val="TableParagraph"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>Date</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
            <w:shd w:fill="E8E8E8"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:pStyle w:val="TableParagraph"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:sz w:val="20"/>
              </w:rPr>
              <w:t>Gravité</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:pStyle w:val="TableParagraph"/>
            </w:pPr>
            <w:r>
              <w:t>${escapeXml(typeLabel)}</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:pStyle w:val="TableParagraph"/>
            </w:pPr>
            <w:r>
              <w:t>${log.date} ${log.time}</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:pStyle w:val="TableParagraph"/>
            </w:pPr>
            <w:r>
              <w:t>${severityLabel}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:p>
      <w:r>
        <w:t>Description: ${escapeXml(log.description)}</w:t>
      </w:r>
    </w:p>
    <w:p/>
      `;
    })
    .join('');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="32"/>
        </w:rPr>
        <w:t>Livret de Bord Étudiant</w:t>
      </w:r>
    </w:p>
    
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:t>Rapport Disciplinaire</w:t>
      </w:r>
    </w:p>
    
    <w:p/>
    
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9144" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="12" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="12" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="12" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="12" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="12" w:space="0" w:color="000000"/>
          <w:insideV w:val="single" w:sz="12" w:space="0" w:color="000000"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:trPr>
          <w:trHeight w:val="400" w:type="atLeast"/>
        </w:trPr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4572" w:type="dxa"/>
            <w:shd w:fill="4472C4"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:pStyle w:val="TableParagraph"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:color w:val="FFFFFF"/>
                <w:sz w:val="22"/>
              </w:rPr>
              <w:t>Information</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4572" w:type="dxa"/>
            <w:shd w:fill="4472C4"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:pStyle w:val="TableParagraph"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
                <w:color w:val="FFFFFF"/>
                <w:sz w:val="22"/>
              </w:rPr>
              <w:t>Détails</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4572" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:rPr>
                <w:b/>
              </w:rPr>
              <w:t>Nom</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4572" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:t>${escapeXml(student.firstName)} ${escapeXml(student.lastName)}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4572" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:rPr>
                <w:b/>
              </w:rPr>
              <w:t>Email</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4572" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:t>${escapeXml(student.email || 'N/A')}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4572" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:rPr>
                <w:b/>
              </w:rPr>
              <w:t>Téléphone</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4572" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:t>${escapeXml(student.phone || 'N/A')}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4572" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:rPr>
                <w:b/>
              </w:rPr>
              <w:t>Date de génération</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="4572" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:t>${generatedDate}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    
    <w:p/>
    <w:p/>
    
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading2"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="28"/>
        </w:rPr>
        <w:t>Résumé des Incidents</w:t>
      </w:r>
    </w:p>
    
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9144" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="12" w:space="0" w:color="CCCCCC"/>
          <w:left w:val="single" w:sz="12" w:space="0" w:color="CCCCCC"/>
          <w:bottom w:val="single" w:sz="12" w:space="0" w:color="CCCCCC"/>
          <w:right w:val="single" w:sz="12" w:space="0" w:color="CCCCCC"/>
          <w:insideH w:val="single" w:sz="12" w:space="0" w:color="CCCCCC"/>
          <w:insideV w:val="single" w:sz="12" w:space="0" w:color="CCCCCC"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tr>
        <w:trPr>
          <w:trHeight w:val="400" w:type="atLeast"/>
        </w:trPr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
            <w:shd w:fill="F2F2F2"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:pStyle w:val="TableParagraph"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
              </w:rPr>
              <w:t>Type</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
            <w:shd w:fill="F2F2F2"/>
          </w:tcPr>
          <w:p>
            <w:pPr>
              <w:pStyle w:val="TableParagraph"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:b/>
              </w:rPr>
              <w:t>Nombre</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:t>Avertissements</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:t>${incidentCounts.avertissement}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:t>Incidents</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:t>${incidentCounts.incident}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:t>Mises à pied</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:t>${incidentCounts.mise_a_pied}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:t>Exclusions</w:t>
            </w:r>
          </w:p>
        </w:tc>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2286" w:type="dxa"/>
          </w:tcPr>
          <w:p>
            <w:r>
              <w:t>${incidentCounts.termination}</w:t>
            </w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    
    <w:p/>
    <w:p/>
    
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading2"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:sz w:val="28"/>
        </w:rPr>
        <w:t>Détail des Incidents</w:t>
      </w:r>
    </w:p>
    
    ${logsXml}
    
    <w:p/>
    <w:p>
      <w:r>
        <w:t>Fin du rapport</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`;

  // Use TextEncoder for Edge Runtime compatibility instead of Buffer
  const encoder = new TextEncoder();
  return encoder.encode(documentXml);
}

function getTypeLabel(type: string): string {
  const labels: { [key: string]: string } = {
    avertissement: 'Avertissement',
    incident: 'Incident',
    mise_a_pied: 'Mise à pied',
    termination: 'Exclusion',
    autre: 'Autre',
  };
  return labels[type] || type;
}

function escapeXml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
