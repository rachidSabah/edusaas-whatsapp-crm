export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

/**
 * Upload and process document files for knowledge base
 * Supports: PDF, DOCX, TXT, Images
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not supported' },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const fileBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(fileBuffer).toString('utf-8');

    // Parse file content and extract Q&A pairs
    let extractedItems: Array<{ question: string; answer: string; category: string }> = [];

    if (file.type === 'text/plain') {
      // Parse TXT file - expect format: Q: question\nA: answer\n\n
      extractedItems = parseTxtFile(fileContent);
    } else if (file.type === 'application/pdf') {
      // For PDF, we would need a PDF parser library
      // For now, we'll create a placeholder that extracts text
      extractedItems = parsePdfFile(fileContent);
    } else if (
      file.type ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      // For DOCX, we would need a DOCX parser
      // For now, placeholder
      extractedItems = parseDocxFile(fileContent);
    } else if (file.type.startsWith('image/')) {
      // For images, we would use OCR
      // For now, placeholder
      extractedItems = [
        {
          question: `Image: ${fileName}`,
          answer: 'Image uploaded. OCR processing would extract text here.',
          category: 'Images',
        },
      ];
    }

    // Save extracted items to database
    let itemsCreated = 0;

    for (const item of extractedItems) {
      const id = `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        await db.execute(
          `INSERT INTO knowledge_base 
           (id, organizationId, question, answer, category, source, sourceFile)
           VALUES (?, ?, ?, ?, ?, 'document', ?)`,
          [id, user.organizationId, item.question, item.answer, item.category, fileName]
        );
        itemsCreated++;
      } catch (error) {
        console.error('Error inserting knowledge base item:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `File processed successfully`,
      itemsCreated,
      fileName,
    });
  } catch (error: any) {
    console.error('Upload knowledge base error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Parse TXT file for Q&A pairs
 * Expected format:
 * Q: Question here?
 * A: Answer here.
 * 
 * Q: Another question?
 * A: Another answer.
 */
function parseTxtFile(content: string): Array<{
  question: string;
  answer: string;
  category: string;
}> {
  const items: Array<{ question: string; answer: string; category: string }> = [];
  const lines = content.split('\n');

  let currentQuestion = '';
  let currentAnswer = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('Q:')) {
      if (currentQuestion && currentAnswer) {
        items.push({
          question: currentQuestion,
          answer: currentAnswer,
          category: 'Document',
        });
      }
      currentQuestion = trimmed.substring(2).trim();
      currentAnswer = '';
    } else if (trimmed.startsWith('A:')) {
      currentAnswer = trimmed.substring(2).trim();
    } else if (trimmed && currentQuestion && !currentAnswer) {
      currentQuestion += ' ' + trimmed;
    } else if (trimmed && currentAnswer) {
      currentAnswer += ' ' + trimmed;
    }
  }

  if (currentQuestion && currentAnswer) {
    items.push({
      question: currentQuestion,
      answer: currentAnswer,
      category: 'Document',
    });
  }

  return items;
}

/**
 * Parse PDF file
 * Note: Full PDF parsing requires external library
 * This is a placeholder that extracts basic text
 */
function parsePdfFile(content: string): Array<{
  question: string;
  answer: string;
  category: string;
}> {
  // Extract Q&A pairs from PDF content
  return extractQAPairsFromText(content);
}

/**
 * Parse DOCX file
 * Note: Full DOCX parsing requires external library
 * This is a placeholder
 */
function parseDocxFile(content: string): Array<{
  question: string;
  answer: string;
  category: string;
}> {
  // Extract Q&A pairs from DOCX content
  return extractQAPairsFromText(content);
}

/**
 * Extract Q&A pairs from any text content
 */
function extractQAPairsFromText(content: string): Array<{
  question: string;
  answer: string;
  category: string;
}> {
  const items: Array<{ question: string; answer: string; category: string }> = [];
  const lines = content.split(/\n|\r\n/).filter((line) => line.trim());

  let currentQuestion = '';
  let currentAnswer = '';
  let currentCategory = 'Document';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for category markers
    if (line.startsWith('##') || line.startsWith('Category:')) {
      currentCategory = line.replace(/^#+\s*|^Category:\s*/i, '').trim();
      continue;
    }

    // Check for question markers
    if (
      line.startsWith('Q:') ||
      line.startsWith('Question:') ||
      line.startsWith('?')
    ) {
      // Save previous Q&A if exists
      if (currentQuestion && currentAnswer) {
        items.push({
          question: currentQuestion,
          answer: currentAnswer,
          category: currentCategory,
        });
      }

      currentQuestion = line.replace(/^(Q:|Question:|\?)\s*/i, '').trim();
      currentAnswer = '';
      continue;
    }

    // Check for answer markers
    if (
      line.startsWith('A:') ||
      line.startsWith('Answer:') ||
      line.startsWith('Réponse:')
    ) {
      currentAnswer = line.replace(/^(A:|Answer:|Réponse:)\s*/i, '').trim();
      continue;
    }

    // If we have a question, accumulate answer lines
    if (currentQuestion && !currentAnswer) {
      currentAnswer = line;
    } else if (currentQuestion && currentAnswer) {
      // Continue accumulating answer
      currentAnswer += ' ' + line;
    }
  }

  // Don't forget the last pair
  if (currentQuestion && currentAnswer) {
    items.push({
      question: currentQuestion,
      answer: currentAnswer,
      category: currentCategory,
    });
  }

  // Filter out very short or invalid pairs
  return items.filter(
    (p) =>
      p.question.length > 5 &&
      p.answer.length > 10 &&
      p.question.length < 500 &&
      p.answer.length < 2000
  );
}
