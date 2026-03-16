export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

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

    if (!aiConfig.puerApiKey) {
      return NextResponse.json(
        {
          success: false,
          message: 'Clé API Puter non configurée',
        },
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

    // In production, this would call Puter API
    // For now, simulate a response based on knowledge base
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
 * In production, this would use Puter API or other LLM
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
