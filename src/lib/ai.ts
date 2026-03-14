// AI Integration using Puter.js (Free, No API Keys Required)
import { 
  initPuter, 
  isPuterLoaded, 
  aiChat, 
  AI_MODELS,
  DEFAULT_MODEL
} from './puter';

export interface AIResponse {
  text: string;
  confidence?: number;
  model?: string;
}

export interface ConversationContext {
  studentName?: string;
  organizationName?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  knowledgeBase?: string;
}

// Re-export AI models for external use
export { AI_MODELS, DEFAULT_MODEL };

// Alias for checking if Puter is available
export const isPuterAvailable = isPuterLoaded;

// Initialize Puter.js when this module is loaded (client-side only)
if (typeof window !== 'undefined') {
  initPuter();
}

/**
 * Generate AI response for chat messages
 * Uses Puter.js - Free, no API key required
 */
export async function generateAIResponse(
  message: string,
  context: ConversationContext = {}
): Promise<AIResponse> {
  // Build system prompt with context
  let systemPrompt = `You are a helpful AI assistant for an educational institution's WhatsApp CRM system.
Your role is to help respond to inquiries from students, parents, and prospects in a professional and helpful manner.
Always be polite, concise, and helpful.
Respond in the same language as the user's message.`;

  if (context.organizationName) {
    systemPrompt += `\n\nYou represent ${context.organizationName}.`;
  }

  if (context.knowledgeBase) {
    systemPrompt += `\n\nUse the following knowledge base to inform your responses:\n${context.knowledgeBase}`;
  }

  // Add conversation history if available
  let fullPrompt = '';
  if (context.conversationHistory && context.conversationHistory.length > 0) {
    fullPrompt = `Previous conversation:\n${context.conversationHistory
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n')}\n\nCurrent message: ${message}`;
  } else {
    fullPrompt = message;
  }

  const response = await aiChat(fullPrompt, {
    model: DEFAULT_MODEL,
    systemPrompt,
  });

  return {
    text: response,
    model: DEFAULT_MODEL,
  };
}

/**
 * Stream AI response for real-time display
 */
export async function* streamAIResponse(
  message: string,
  context: ConversationContext = {}
): AsyncGenerator<string, void, unknown> {
  let systemPrompt = `You are a helpful AI assistant for an educational institution's WhatsApp CRM system.
Always be polite, concise, and helpful.
Respond in the same language as the user's message.`;

  if (context.organizationName) {
    systemPrompt += `\n\nYou represent ${context.organizationName}.`;
  }

  if (context.knowledgeBase) {
    systemPrompt += `\n\nKnowledge base:\n${context.knowledgeBase}`;
  }

  const fullPrompt = context.conversationHistory?.length
    ? `Previous: ${context.conversationHistory.map((m) => `${m.role}: ${m.content}`).join(' | ')}\n\nNow: ${message}`
    : message;

  // Use streaming version of aiChat
  const response = await aiChat(fullPrompt, { 
    model: DEFAULT_MODEL,
    systemPrompt,
    stream: true 
  });
  
  yield response;
}

/**
 * Detect the language of a message
 */
export function detectLanguage(text: string): 'fr' | 'en' | 'ar' | 'unknown' {
  // Arabic detection
  if (/[\u0600-\u06FF]/.test(text)) {
    return 'ar';
  }
  
  // French detection (common French words)
  const frenchWords = ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'bonjour', 'merci', 'svp', 's\'il', 'vous', 'nous'];
  const englishWords = ['the', 'a', 'an', 'and', 'or', 'hello', 'thank', 'please', 'you', 'we', 'is', 'are'];
  
  const lowerText = text.toLowerCase();
  let frenchCount = 0;
  let englishCount = 0;
  
  frenchWords.forEach(word => {
    if (lowerText.includes(word)) frenchCount++;
  });
  
  englishWords.forEach(word => {
    if (lowerText.includes(word)) englishCount++;
  });
  
  if (frenchCount > englishCount) return 'fr';
  if (englishCount > frenchCount) return 'en';
  
  return 'unknown';
}

/**
 * Generate suggested responses for a conversation
 */
export async function generateSuggestedResponses(
  message: string,
  language: 'fr' | 'en' | 'ar' = 'fr'
): Promise<string[]> {
  const prompt = `Generate 3 short, professional response suggestions for this WhatsApp message.
Each response should be on a new line and be concise (1-2 sentences max).
${language === 'fr' ? 'Respond in French.' : language === 'ar' ? 'Respond in Arabic.' : 'Respond in English.'}

Message: ${message}

Suggested responses:`;

  const response = await aiChat(prompt, {
    model: DEFAULT_MODEL,
  });

  return response.split('\n').filter(line => line.trim()).slice(0, 3);
}

/**
 * Analyze sentiment of a message
 */
export async function analyzeSentiment(
  message: string
): Promise<'positive' | 'neutral' | 'negative'> {
  const prompt = `Analyze the sentiment of this message and respond with exactly one word: positive, neutral, or negative.

Message: ${message}

Sentiment:`;

  const response = await aiChat(prompt, {
    model: DEFAULT_MODEL,
  });

  const sentiment = response.toLowerCase().trim();
  if (sentiment.includes('positive')) return 'positive';
  if (sentiment.includes('negative')) return 'negative';
  return 'neutral';
}

/**
 * Categorize a conversation
 */
export async function categorizeConversation(
  message: string
): Promise<'enrollment' | 'student_request' | 'parent_inquiry' | 'support' | 'general'> {
  const prompt = `Categorize this message into one of these categories:
- enrollment: Questions about enrollment, registration, or joining
- student_request: Requests from current students
- parent_inquiry: Questions from parents
- support: Technical support or help requests
- general: General inquiries or other

Respond with only the category name (one word).

Message: ${message}

Category:`;

  const response = await aiChat(prompt, {
    model: DEFAULT_MODEL,
  });

  const category = response.toLowerCase().trim();
  if (category.includes('enrollment')) return 'enrollment';
  if (category.includes('student')) return 'student_request';
  if (category.includes('parent')) return 'parent_inquiry';
  if (category.includes('support')) return 'support';
  return 'general';
}

/**
 * Generate attendance notification
 */
export async function generateAttendanceNotification(
  studentName: string,
  status: 'absent' | 'late',
  organizationName: string,
  language: 'fr' | 'en' | 'ar' = 'fr'
): Promise<string> {
  const prompt = `Generate a polite WhatsApp message to notify parents that their child ${studentName} was marked as ${status} today.
The message should be from ${organizationName}.
Keep it brief, professional, and caring.
${language === 'fr' ? 'Write in French.' : language === 'ar' ? 'Write in Arabic.' : 'Write in English.'}`;

  return aiChat(prompt, {
    model: DEFAULT_MODEL,
  });
}

/**
 * Translate text
 */
export async function translateText(
  text: string,
  fromLang: string,
  toLang: string
): Promise<string> {
  const prompt = `Translate the following text from ${fromLang} to ${toLang}.
Only output the translation, nothing else.

Text: ${text}

Translation:`;

  return aiChat(prompt, {
    model: DEFAULT_MODEL,
  });
}

// Export initPuter for initialization
export { initPuter };
