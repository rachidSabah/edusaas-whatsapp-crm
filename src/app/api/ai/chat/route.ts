export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getDbContext } from '@/lib/db-hybrid';
import { DEFAULT_AI_CONFIG, type AIConfig } from '@/app/api/ai-config/constants';
import { requireAuth } from '@/lib/auth-hybrid';

interface KnowledgeEntry {
  id: string;
  organizationId: string;
  question: string;
  answer: string;
  category: string;
  keywords: string | null;
  priority: number;
}

interface AIConfigRecord {
  id: string;
  organizationId: string;
  systemInstructions: string;
  responseTone: string;
  language: string;
  knowledgeBaseEnabled: number;
  autoReplyEnabled: number;
  autoReplyCategories: string;
  maxResponseLength: number;
  includeSignature: number;
  signatureText: string;
}

interface ConversationHistory {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  organizationId: string;
  conversationId?: string;
  history?: ConversationHistory[];
}

// Get AI configuration for organization
async function getAIConfig(db: ReturnType<typeof getDbContext>, organizationId: string): Promise<AIConfig> {
  try {
    const configs = await db.query<AIConfigRecord>(
      `SELECT * FROM ai_config WHERE organizationId = ?`,
      [organizationId]
    );

    if (configs.length === 0) {
      return DEFAULT_AI_CONFIG;
    }

    const record = configs[0];
    return {
      systemInstructions: record.systemInstructions || DEFAULT_AI_CONFIG.systemInstructions,
      responseTone: (record.responseTone as AIConfig['responseTone']) || DEFAULT_AI_CONFIG.responseTone,
      language: (record.language as AIConfig['language']) || DEFAULT_AI_CONFIG.language,
      knowledgeBaseEnabled: record.knowledgeBaseEnabled === 1,
      autoReplyEnabled: record.autoReplyEnabled === 1,
      autoReplyCategories: record.autoReplyCategories ? JSON.parse(record.autoReplyCategories) : DEFAULT_AI_CONFIG.autoReplyCategories,
      maxResponseLength: record.maxResponseLength || DEFAULT_AI_CONFIG.maxResponseLength,
      includeSignature: record.includeSignature === 1,
      signatureText: record.signatureText || DEFAULT_AI_CONFIG.signatureText,
    };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

// Search knowledge base for relevant entries
async function searchKnowledgeBase(
  db: ReturnType<typeof getDbContext>,
  organizationId: string,
  query: string
): Promise<KnowledgeEntry[]> {
  try {
    const searchPattern = `%${query}%`;
    const entries = await db.query<KnowledgeEntry>(
      `SELECT * FROM knowledge_base 
       WHERE organizationId = ? AND isActive = 1 
       AND (question LIKE ? OR answer LIKE ? OR keywords LIKE ?)
       ORDER BY priority DESC
       LIMIT 5`,
      [organizationId, searchPattern, searchPattern, searchPattern]
    );
    return entries;
  } catch {
    return [];
  }
}

// Build system prompt with knowledge base context
function buildSystemPrompt(config: AIConfig, knowledgeBase: KnowledgeEntry[]): string {
  let prompt = config.systemInstructions;

  // Add tone instruction
  const toneInstructions = {
    formal: '\n\nMaintenez un ton formel et professionnel. Utilisez le vouvoiement.',
    friendly: '\n\nSoyez chaleureux et amical dans vos réponses. Créez une atmosphère accueillante.',
    professional: '\n\nRestez professionnel tout en étant accessible et serviable.',
  };
  prompt += toneInstructions[config.responseTone];

  // Add knowledge base context
  if (config.knowledgeBaseEnabled && knowledgeBase.length > 0) {
    prompt += '\n\nInformations pertinentes de la base de connaissances:\n';
    knowledgeBase.forEach((entry, index) => {
      prompt += `${index + 1}. Q: ${entry.question}\n   R: ${entry.answer}\n`;
    });
    prompt += '\nUtilisez ces informations pour répondre à la question si elles sont pertinentes.';
  }

  return prompt;
}

// Store conversation history
async function storeConversationHistory(
  db: ReturnType<typeof getDbContext>,
  organizationId: string,
  conversationId: string | undefined,
  userMessage: string,
  aiResponse: string
): Promise<string> {
  try {
    const convId = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Store the AI interaction
    await db.execute(
      `INSERT INTO ai_interactions (id, organizationId, conversationId, userMessage, aiResponse, createdAt)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [`ai_int_${Date.now()}`, organizationId, convId, userMessage, aiResponse]
    );

    return convId;
  } catch (error) {
    console.error('Error storing conversation history:', error);
    return conversationId || '';
  }
}

// AI completion using direct API call (Edge-compatible)
async function generateAIResponse(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number
): Promise<string> {
  // Use the AI API endpoint directly via fetch (Edge-compatible)
  const apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    // Fallback to a simple response if no API key is configured
    return 'Je suis désolé, le service IA n\'est pas configuré. Veuillez contacter l\'administration.';
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        max_tokens: Math.min(maxTokens, 1000),
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 
      'Je ne suis pas en mesure de répondre à cette question pour le moment.';
  } catch (error) {
    console.error('AI generation error:', error);
    return 'Je rencontre des difficultés techniques. Veuillez réessayer plus tard.';
  }
}

// Main chat endpoint
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();
    
    const body: ChatRequest = await request.json();
    const { message, organizationId, conversationId, history } = body;

    // Validate organization access
    if (!organizationId || organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Accès non autorisé', message: 'Vous n\'avez pas accès à cette organisation.' },
        { status: 403 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'Message requis', message: 'Veuillez fournir un message.' },
        { status: 400 }
      );
    }

    const db = getDbContext();

    // Get AI configuration
    const config = await getAIConfig(db, organizationId);

    // Check if auto-reply is enabled
    if (!config.autoReplyEnabled) {
      return NextResponse.json({
        response: 'Le mode de réponse automatique est désactivé. Veuillez contacter l\'administration.',
        autoReplyDisabled: true,
      });
    }

    // Search knowledge base
    let knowledgeBase: KnowledgeEntry[] = [];
    if (config.knowledgeBaseEnabled) {
      knowledgeBase = await searchKnowledgeBase(db, organizationId, message);
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(config, knowledgeBase);

    // Build messages array for AI
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history if available
    if (history && history.length > 0) {
      history.forEach((msg) => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    // Generate AI response
    let responseText = await generateAIResponse(messages, config.maxResponseLength);

    // Add signature if configured
    if (config.includeSignature && config.signatureText) {
      responseText += `\n\n${config.signatureText}`;
    }

    // Store conversation history
    const newConversationId = await storeConversationHistory(
      db,
      organizationId,
      conversationId,
      message,
      responseText
    );

    return NextResponse.json({
      response: responseText,
      conversationId: newConversationId,
      knowledgeBaseUsed: knowledgeBase.length > 0,
      knowledgeBaseCount: knowledgeBase.length,
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', message: 'Une erreur s\'est produite lors du traitement de votre demande.' },
      { status: 500 }
    );
  }
}

// Get conversation history
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();
    
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const conversationId = searchParams.get('conversationId');

    // Validate organization access
    if (!organizationId || organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    const db = getDbContext();

    if (conversationId) {
      // Get specific conversation
      const interactions = await db.query<{
        id: string;
        conversationId: string;
        userMessage: string;
        aiResponse: string;
        createdAt: string;
      }>(
        `SELECT id, conversationId, userMessage, aiResponse, createdAt 
         FROM ai_interactions 
         WHERE organizationId = ? AND conversationId = ?
         ORDER BY createdAt ASC`,
        [organizationId, conversationId]
      );

      return NextResponse.json({ interactions });
    } else {
      // Get all conversations for organization
      const conversations = await db.query<{
        conversationId: string;
        lastMessage: string;
        lastMessageAt: string;
        messageCount: number;
      }>(
        `SELECT conversationId, 
                MAX(userMessage) as lastMessage,
                MAX(createdAt) as lastMessageAt,
                COUNT(*) as messageCount
         FROM ai_interactions 
         WHERE organizationId = ?
         GROUP BY conversationId
         ORDER BY lastMessageAt DESC
         LIMIT 50`,
        [organizationId]
      );

      return NextResponse.json({ conversations });
    }
  } catch (error) {
    console.error('Get conversation history error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', message: 'Impossible de récupérer l\'historique des conversations.' },
      { status: 500 }
    );
  }
}
