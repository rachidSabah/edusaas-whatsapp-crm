export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

interface KnowledgeEntry {
  id: string;
  organizationId: string;
  question: string;
  answer: string;
  category: string;
  keywords: string | null;
  priority: number;
  isActive: number;
  createdAt: string;
}

// Extract text from different file types
async function extractTextFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.txt')) {
    // Plain text file - decode directly
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(buffer);
  }
  
  if (fileName.endsWith('.pdf')) {
    // PDF extraction - use simple text extraction
    // Since we're in Edge runtime, we'll decode the PDF content
    const decoder = new TextDecoder('utf-8');
    const rawText = decoder.decode(buffer);
    
    // Extract readable text from PDF (basic extraction)
    // Look for text between stream/endstream or text objects
    let extractedText = '';
    
    // Try to extract text content from PDF streams
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;
    while ((match = streamRegex.exec(rawText)) !== null) {
      const streamContent = match[1];
      // Try to decode if it looks like text
      if (!/[\x00-\x08\x0E-\x1F]/.test(streamContent.substring(0, 100))) {
        extractedText += streamContent + '\n';
      }
    }
    
    // Also try to extract text from BT/ET blocks (text objects)
    const textBlockRegex = /BT[\s\S]*?ET/g;
    while ((match = textBlockRegex.exec(rawText)) !== null) {
      const block = match[0];
      // Extract text from Tj and TJ operators
      const tjRegex = /\(([^)]+)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        extractedText += tjMatch[1] + ' ';
      }
    }
    
    // Clean up the extracted text
    extractedText = extractedText
      .replace(/[^\x20-\x7E\n\ràâäéèêëïîôùûüÿçæœÀÂÄÉÈÊËÏÎÔÙÛÜŸÇÆŒ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return extractedText || `[PDF file: ${file.name} - Content requires PDF parser for full extraction]`;
  }
  
  if (fileName.endsWith('.docx')) {
    // DOCX is a ZIP file with XML content
    // In Edge runtime, we'll try a simple approach
    const decoder = new TextDecoder('utf-8');
    const rawText = decoder.decode(buffer);
    
    // Try to extract text from XML content
    let extractedText = '';
    
    // Look for text content in XML tags
    const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let match;
    while ((match = textRegex.exec(rawText)) !== null) {
      extractedText += match[1];
    }
    
    // Also try paragraph content
    const pRegex = /<w:p[^>]*>[\s\S]*?<\/w:p>/g;
    while ((match = pRegex.exec(rawText)) !== null) {
      const pContent = match[0];
      const tMatches = pContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      if (tMatches) {
        tMatches.forEach(t => {
          const text = t.replace(/<[^>]*>/g, '');
          if (text) extractedText += text;
        });
        extractedText += '\n';
      }
    }
    
    // Clean up
    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .trim();
    
    return extractedText || `[DOCX file: ${file.name} - Content requires DOCX parser for full extraction]`;
  }
  
  throw new Error('Unsupported file format');
}

// Use AI to extract Q&A pairs from text
async function extractQAFromText(text: string): Promise<Array<{ question: string; answer: string; category: string }>> {
  // Since we're in Edge runtime and can't use z-ai-web-dev-sdk directly here,
  // we'll use a pattern-based extraction approach with some heuristics
  
  const entries: Array<{ question: string; answer: string; category: string }> = [];
  
  // Try to find Q&A patterns in the text (without 's' flag for broader compatibility)
  // Using [\s\S] to match any character including newlines
  const qaPatterns = [
    /Q[:：]\s*([\s\S]+?)\s*A[:：]\s*([\s\S]+?)(?=Q[:：]|$)/gi,
    /Question[:：]\s*([\s\S]+?)\s*Réponse[:：]\s*([\s\S]+?)(?=Question[:：]|$)/gi,
    /FAQ[:：]?\s*\n([\s\S]+?)\n\s*[-–—]\s*([\s\S]+?)(?=FAQ|Question|$)/gi,
  ];
  
  for (const pattern of qaPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const question = match[1].trim();
      const answer = match[2].trim();
      if (question && answer && question.length > 5 && answer.length > 10) {
        entries.push({ question, answer, category: 'FAQ' });
      }
    }
  }
  
  // If no Q&A patterns found, create entries from paragraphs
  if (entries.length === 0) {
    // Split by paragraphs and create knowledge entries
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 20);
    
    // Group related sentences into Q&A pairs
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      
      // Check if paragraph looks like a question
      if (paragraph.includes('?') || paragraph.toLowerCase().startsWith('comment') || 
          paragraph.toLowerCase().startsWith('pourquoi') || paragraph.toLowerCase().startsWith('quand') ||
          paragraph.toLowerCase().startsWith('où') || paragraph.toLowerCase().startsWith('qui') ||
          paragraph.toLowerCase().startsWith('combien') || paragraph.toLowerCase().startsWith('quel')) {
        // This might be a question
        const nextParagraph = paragraphs[i + 1];
        if (nextParagraph && !nextParagraph.includes('?')) {
          entries.push({
            question: paragraph,
            answer: nextParagraph,
            category: 'GENERAL',
          });
          i++; // Skip next paragraph
        } else {
          // Question is its own paragraph, use as both question and look for context
          entries.push({
            question: paragraph,
            answer: paragraph.replace('?', '.').replace('?', '.'),
            category: 'GENERAL',
          });
        }
      } else {
        // Create a knowledge entry from informational text
        // Extract key information
        const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim());
        if (sentences.length >= 2) {
          // First sentence as "topic", rest as content
          entries.push({
            question: `Qu'est-ce que "${sentences[0].trim().substring(0, 50)}..."?`,
            answer: paragraph,
            category: 'GENERAL',
          });
        } else if (paragraph.length > 30) {
          entries.push({
            question: `Information: ${paragraph.substring(0, 50)}...`,
            answer: paragraph,
            category: 'GENERAL',
          });
        }
      }
    }
  }
  
  return entries.slice(0, 20); // Limit to 20 entries per document
}

// Handle file upload
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
    const autoExtract = formData.get('autoExtract') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf') && !fileName.endsWith('.docx') && !fileName.endsWith('.txt')) {
      return NextResponse.json(
        { error: 'Invalid file format. Only PDF, DOCX, and TXT files are supported.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Extract text from file
    const extractedText = await extractTextFromFile(file);

    // If auto-extract is enabled, create knowledge base entries
    const entries: KnowledgeEntry[] = [];
    let totalExtracted = 0;

    if (autoExtract && extractedText.length > 50) {
      const qaPairs = await extractQAFromText(extractedText);
      totalExtracted = qaPairs.length;

      for (const qa of qaPairs) {
        const id = `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await db.execute(
          `INSERT INTO knowledge_base (id, organizationId, question, answer, category, keywords, priority, isActive)
           VALUES (?, ?, ?, ?, ?, ?, 0, 1)`,
          [id, user.organizationId, qa.question, qa.answer, qa.category, null]
        );

        const result = await db.query<KnowledgeEntry>(
          `SELECT * FROM knowledge_base WHERE id = ?`,
          [id]
        );

        if (result[0]) {
          entries.push(result[0]);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: totalExtracted > 0 
        ? `${totalExtracted} entrée(s) extraite(s) et ajoutée(s) à la base de connaissances`
        : 'Document uploaded but no Q&A patterns found. Try adding entries manually.',
      entries,
      extractedText: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : ''),
      totalExtracted,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
