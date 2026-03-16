import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const { studentId, studentName, logs } = body;

    if (!studentId || !logs) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create a simple DOCX-like document using a library
    // For now, we'll create a basic text-based document
    const docContent = generateDocxContent(studentName, logs);

    // Return as downloadable file
    return new NextResponse(docContent, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="rapport_${studentName.replace(/\s+/g, '_')}.docx"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateDocxContent(studentName: string, logs: any[]): Buffer {
  // This is a simplified version. In production, use a library like docx or docxtemplater
  // For now, we'll create a basic XML structure that can be opened as DOCX

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
      </w:pPr>
      <w:r>
        <w:t>Rapport Disciplinaire - ${studentName}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Date de génération: ${new Date().toLocaleDateString('fr-FR')}</w:t>
      </w:r>
    </w:p>
    <w:p/>
    ${logs
      .map(
        (log: any) => `
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading2"/>
      </w:pPr>
      <w:r>
        <w:t>${log.type.toUpperCase()} - ${log.date} ${log.time}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Gravité: ${log.severity}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>${log.description}</w:t>
      </w:r>
    </w:p>
    <w:p/>
    `
      )
      .join('')}
  </w:body>
</w:document>`;

  return Buffer.from(xml, 'utf-8');
}
