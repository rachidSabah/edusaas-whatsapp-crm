export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

/**
 * Test AI response with knowledge base
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

    const body = await request.json();
    const { testMessage, aiConfig } = body;

    if (!testMessage || !aiConfig) {
      return NextResponse.json(
        { error: 'Missing test message or AI config' },
        { status: 400 }
      );
    }

    // Get knowledge base items if enabled
    let knowledgeBase: Array<{ question: string; answer: string }> = [];

    if (aiConfig.includeKnowledgeBase) {
      const items = await db.query<{
        question: string;
        answer: string;
      }>(
        `SELECT question, answer FROM knowledge_base WHERE organizationId = ? LIMIT 50`,
        [user.organizationId]
      );
      knowledgeBase = items;
    }

    // Simulate AI response based on knowledge base using Puter.js
    let aiResponse = simulateAIResponse(testMessage, knowledgeBase);

    // Format response with template
    const formattedResponse = aiConfig.responseTemplate.replace(
      '{answer}',
      aiResponse
    );

    // Truncate if needed
    const finalResponse = formattedResponse.substring(
      0,
      aiConfig.maxResponseLength
    );

    return NextResponse.json({
      success: true,
      message: 'Test réussi',
      testMessage,
      aiResponse: finalResponse,
      knowledgeBaseUsed: aiConfig.includeKnowledgeBase,
      itemsInBase: knowledgeBase.length,
      model: aiConfig.selectedModel || 'default',
    });
  } catch (error: any) {
    console.error('Test AI error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erreur lors du test',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Simulate AI response based on knowledge base
 * In production, this would use Puter.js (puter.ai.chat()) on the frontend
 */
function simulateAIResponse(
  testMessage: string,
  knowledgeBase: Array<{ question: string; answer: string }>
): string {
  // Simple keyword matching for demo
  const messageLower = testMessage.toLowerCase();

  // Find best matching Q&A
  for (const item of knowledgeBase) {
    const questionLower = item.question.toLowerCase();
    const keywords = questionLower.split(' ').filter(w => w.length > 3);

    for (const keyword of keywords) {
      if (messageLower.includes(keyword)) {
        return item.answer;
      }
    }
  }

  // Default response if no match found
  return `Je n'ai pas trouvé de réponse précise à votre question "${testMessage}" dans ma base de connaissance. Veuillez reformuler votre question ou contactez le support.`;
}
