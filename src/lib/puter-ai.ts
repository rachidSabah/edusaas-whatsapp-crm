/**
 * Puter AI Integration Service
 * Handles automatic responses based on knowledge base and documents
 */

import { getDbContext } from './db-context';

interface AIConfig {
  puerApiKey: string;
  responseTemplate: string;
  maxResponseLength: number;
  includeKnowledgeBase: boolean;
  autoRespondToAll: boolean;
  responseDelay: number;
}

interface KnowledgeBaseItem {
  question: string;
  answer: string;
  category: string;
  source: string;
}

/**
 * Generate AI response based on incoming message and knowledge base
 */
export async function generateAIResponse(
  organizationId: string,
  incomingMessage: string,
  senderPhone: string
): Promise<{ response: string; confidence: number; source: string } | null> {
  try {
    const db = getDbContext();

    // Get AI configuration
    const configs = await db.query<AIConfig>(
      `SELECT puerApiKey, responseTemplate, maxResponseLength, includeKnowledgeBase, autoRespondToAll
       FROM ai_automation_config
       WHERE organizationId = ? AND isEnabled = 1`,
      [organizationId]
    );

    if (!configs || configs.length === 0) {
      console.log('AI automation not configured for organization:', organizationId);
      return null;
    }

    const config = configs[0];

    // Get knowledge base items
    const knowledgeBase = await db.query<KnowledgeBaseItem>(
      `SELECT question, answer, category, source
       FROM knowledge_base
       WHERE organizationId = ?
       LIMIT 50`,
      [organizationId]
    );

    if (!knowledgeBase || knowledgeBase.length === 0) {
      console.log('No knowledge base items found');
      return null;
    }

    // Find best matching Q&A from knowledge base
    const bestMatch = findBestMatch(incomingMessage, knowledgeBase);

    if (!bestMatch) {
      return null;
    }

    // Generate response using Puter AI
    const response = await callPuterAI(
      config.puerApiKey,
      incomingMessage,
      bestMatch.answer,
      config.responseTemplate,
      config.maxResponseLength
    );

    return {
      response,
      confidence: bestMatch.confidence,
      source: bestMatch.source,
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    return null;
  }
}

/**
 * Find best matching Q&A from knowledge base
 */
function findBestMatch(
  message: string,
  knowledgeBase: KnowledgeBaseItem[]
): { answer: string; confidence: number; source: string } | null {
  const messageLower = message.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const item of knowledgeBase) {
    const questionLower = item.question.toLowerCase();
    const score = calculateSimilarity(messageLower, questionLower);

    if (score > bestScore && score > 0.5) {
      bestScore = score;
      bestMatch = {
        answer: item.answer,
        confidence: score,
        source: item.source,
      };
    }
  }

  return bestMatch;
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Call Puter AI API to generate response
 */
async function callPuterAI(
  apiKey: string,
  userMessage: string,
  knowledgeAnswer: string,
  template: string,
  maxLength: number
): Promise<string> {
  try {
    // In production, this would call the actual Puter API
    // For now, we'll use a simple template-based approach

    const systemPrompt = `You are a helpful educational assistant. Use the provided knowledge base to answer questions accurately and helpfully.

Knowledge Base Answer: ${knowledgeAnswer}

User Question: ${userMessage}

Guidelines:
- Keep response under ${maxLength} characters
- Be professional and helpful
- If the knowledge base doesn't fully answer the question, acknowledge this
- Respond in the same language as the user question`;

    // Simulate Puter API call
    const response = await simulatePuterAPI(systemPrompt, userMessage, template, maxLength);

    return response;
  } catch (error) {
    console.error('Error calling Puter AI:', error);
    throw error;
  }
}

/**
 * Simulate Puter API response (replace with actual API call)
 */
async function simulatePuterAPI(
  systemPrompt: string,
  userMessage: string,
  template: string,
  maxLength: number
): Promise<string> {
  // This is a placeholder implementation
  // In production, replace with actual Puter API call

  const defaultResponses: { [key: string]: string } = {
    absence: 'Merci de nous avoir informé. Nous avons bien noté l\'absence de votre enfant.',
    schedule: 'L\'emploi du temps est disponible dans votre espace personnel.',
    grades: 'Les notes sont mises à jour régulièrement. Veuillez consulter votre espace personnel.',
    contact: 'Pour plus d\'informations, veuillez contacter l\'administration de l\'école.',
  };

  // Simple keyword matching for demo
  const messageLower = userMessage.toLowerCase();

  for (const [key, response] of Object.entries(defaultResponses)) {
    if (messageLower.includes(key)) {
      return response.substring(0, maxLength);
    }
  }

  // Default response
  return template || 'Merci pour votre message. Nous vous répondrons bientôt.';
}

/**
 * Process document and extract knowledge
 */
export async function processDocumentForKnowledge(
  organizationId: string,
  documentContent: string,
  documentName: string,
  documentType: 'pdf' | 'docx' | 'txt' | 'image'
): Promise<KnowledgeBaseItem[]> {
  try {
    const db = getDbContext();

    // Extract Q&A pairs from document
    const extractedItems = await extractQAFromDocument(documentContent, documentType);

    // Store in knowledge base
    const items: KnowledgeBaseItem[] = [];

    for (const item of extractedItems) {
      const id = `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await db.execute(
        `INSERT INTO knowledge_base (id, organizationId, question, answer, category, source, sourceFile)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          organizationId,
          item.question,
          item.answer,
          item.category || 'General',
          'document',
          documentName,
        ]
      );

      items.push({
        question: item.question,
        answer: item.answer,
        category: item.category || 'General',
        source: documentName,
      });
    }

    return items;
  } catch (error) {
    console.error('Error processing document:', error);
    return [];
  }
}

/**
 * Extract Q&A pairs from document
 */
async function extractQAFromDocument(
  content: string,
  type: 'pdf' | 'docx' | 'txt' | 'image'
): Promise<Array<{ question: string; answer: string; category?: string }>> {
  // This is a placeholder - in production, use actual document parsing libraries
  // For PDF: use pdf-parse or pdfjs
  // For DOCX: use docx or mammoth
  // For images: use OCR (tesseract.js)

  const items: Array<{ question: string; answer: string; category?: string }> = [];

  // Simple line-based extraction for demo
  const lines = content.split('\n').filter((line) => line.trim());

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();

    // Look for Q: A: patterns
    if (line.startsWith('Q:') || line.startsWith('Question:')) {
      const question = line.replace(/^(Q:|Question:)\s*/i, '').trim();
      const nextLine = lines[i + 1]?.trim() || '';

      if (nextLine.startsWith('A:') || nextLine.startsWith('Answer:')) {
        const answer = nextLine.replace(/^(A:|Answer:)\s*/i, '').trim();

        items.push({
          question,
          answer,
          category: 'Document',
        });
      }
    }
  }

  return items;
}

/**
 * Send automated response to WhatsApp
 */
export async function sendAutomatedResponse(
  organizationId: string,
  recipientPhone: string,
  message: string,
  phoneNumberId: string,
  accessToken: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch('https://graph.facebook.com/v22.0/' + phoneNumberId + '/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'text',
        text: {
          body: message,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || 'Failed to send message',
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error) {
    console.error('Error sending automated response:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
