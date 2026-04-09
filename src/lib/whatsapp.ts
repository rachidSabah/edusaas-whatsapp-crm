// WhatsApp integration utilities for Edge Runtime
import { getDbContext } from './db-context';
import { generateAIResponse, type ConversationContext } from './ai';

export interface WhatsAppMessage {
  from: string;
  to: string;
  message: string;
  messageId: string;
  timestamp: Date;
  mediaUrl?: string;
  mediaType?: string;
}

export interface WhatsAppSession {
  organizationId: string;
  sessionId: string;
  phone: string;
  isConnected: boolean;
}

/**
 * Process incoming WhatsApp message
 */
export async function processIncomingMessage(data: {
  organizationId: string;
  from: string;
  message: string;
  messageId: string;
  mediaUrl?: string;
  mediaType?: string;
}): Promise<{
  reply?: string;
  conversationId: string;
  shouldAutoReply: boolean;
}> {
  const db = getDbContext();
  const { organizationId, from, message, messageId, mediaUrl, mediaType } = data;

  // Find or create contact
  let contactResult = await db.query<{ id: string }>(
    `SELECT id FROM contacts WHERE organizationId = ? AND phone = ?`,
    [organizationId, from]
  );

  let contactId: string;

  if (contactResult.length === 0) {
    // Create new contact
    contactId = `contact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await db.execute(
      `INSERT INTO contacts (id, organizationId, phone, tags) VALUES (?, ?, ?, 'PROSPECT')`,
      [contactId, organizationId, from]
    );
  } else {
    contactId = contactResult[0].id;
  }

  // Find or create conversation
  let convResult = await db.query<{ id: string }>(
    `SELECT id FROM conversations WHERE organizationId = ? AND contactId = ? AND status IN ('active', 'pending') ORDER BY lastMessageAt DESC LIMIT 1`,
    [organizationId, contactId]
  );

  let conversationId: string;

  if (convResult.length === 0) {
    // Create new conversation
    conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await db.execute(
      `INSERT INTO conversations (id, organizationId, contactId, status, category) VALUES (?, ?, ?, 'active', 'general')`,
      [conversationId, organizationId, contactId]
    );
  } else {
    conversationId = convResult[0].id;
  }

  // Store incoming message
  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  await db.execute(
    `INSERT INTO messages (id, organizationId, conversationId, content, mediaUrl, mediaType, direction, status, whatsappId)
          VALUES (?, ?, ?, ?, ?, ?, 'inbound', 'delivered', ?)`,
    [msgId, organizationId, conversationId, message, mediaUrl || null, mediaType || null, messageId]
  );

  // Update conversation timestamp
  await db.execute(
    `UPDATE conversations SET lastMessageAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    [conversationId]
  );

  // Check if auto-reply is enabled
  const orgResult = await db.query<{ aiEnabled: number; whatsappConnected: number }>(
    `SELECT aiEnabled, whatsappConnected FROM organizations WHERE id = ?`,
    [organizationId]
  );

  const organization = orgResult[0];

  if (!organization || organization.aiEnabled !== 1 || organization.whatsappConnected !== 1) {
    return {
      conversationId,
      shouldAutoReply: false,
    };
  }

  // Get conversation history for context
  const historyResult = await db.query<{ content: string; direction: string }>(
    `SELECT content, direction FROM messages WHERE conversationId = ? ORDER BY createdAt ASC LIMIT 20`,
    [conversationId]
  );

  const conversationHistory = historyResult.map(m => ({
    role: m.direction === 'inbound' ? 'user' as const : 'assistant' as const,
    content: m.content,
  }));

  // Get organization name for context
  const orgNameResult = await db.query<{ name: string }>(
    `SELECT name FROM organizations WHERE id = ?`,
    [organizationId]
  );
  const orgName = orgNameResult[0]?.name;

  // Get knowledge base entries
  const kbResult = await db.query<{ question: string; answer: string }>(
    `SELECT question, answer FROM knowledge_base WHERE organizationId = ? AND isActive = 1 ORDER BY priority DESC`,
    [organizationId]
  );
  
  const knowledgeBase = kbResult.map(kb => `Q: ${kb.question}\nA: ${kb.answer}`).join('\n\n');

  // Generate AI response
  const context: ConversationContext = {
    organizationName: orgName,
    conversationHistory,
    knowledgeBase: knowledgeBase || undefined,
  };

  const aiResponse = await generateAIResponse(message, context);

  // Store outgoing message
  if (aiResponse.text) {
    const outMsgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await db.execute(
      `INSERT INTO messages (id, organizationId, conversationId, content, direction, status, isAiGenerated)
            VALUES (?, ?, ?, ?, 'outbound', 'sent', 1)`,
      [outMsgId, organizationId, conversationId, aiResponse.text]
    );

    // Update conversation
    await db.execute(
      `UPDATE conversations SET lastMessageAt = CURRENT_TIMESTAMP, status = 'active', lastAiReply = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [conversationId]
    );
  }

  return {
    reply: aiResponse.text,
    conversationId,
    shouldAutoReply: !!aiResponse.text,
  };
}

/**
 * Send message through WhatsApp service
 */
export async function sendWhatsAppMessage(data: {
  organizationId: string;
  to: string;
  message: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const db = getDbContext();
    
    // Find contact
    const contactResult = await db.query<{ id: string }>(
      `SELECT id FROM contacts WHERE organizationId = ? AND phone = ?`,
      [data.organizationId, data.to]
    );

    if (contactResult.length > 0) {
      const contactId = contactResult[0].id;

      // Find or create conversation
      let convResult = await db.query<{ id: string }>(
        `SELECT id FROM conversations WHERE organizationId = ? AND contactId = ? AND status IN ('active', 'pending') ORDER BY lastMessageAt DESC LIMIT 1`,
        [data.organizationId, contactId]
      );

      let conversationId: string;

      if (convResult.length === 0) {
        conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        await db.execute(
          `INSERT INTO conversations (id, organizationId, contactId, status) VALUES (?, ?, ?, 'active')`,
          [conversationId, data.organizationId, contactId]
        );
      } else {
        conversationId = convResult[0].id;
      }

      // Store outgoing message
      const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await db.execute(
        `INSERT INTO messages (id, organizationId, conversationId, content, direction, status) VALUES (?, ?, ?, ?, 'outbound', 'sent')`,
        [msgId, data.organizationId, conversationId, data.message]
      );

      // Update conversation
      await db.execute(
        `UPDATE conversations SET lastMessageAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [conversationId]
      );
    }

    return { success: true, messageId: `msg_${Date.now()}` };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: 'Failed to send message' };
  }
}

/**
 * Send absence notification to parent
 */
export async function sendAbsenceNotification(data: {
  organizationId: string;
  parentPhone: string;
  studentName: string;
  groupName: string;
  date: string;
  customMessage?: string;
}): Promise<{ success: boolean; error?: string }> {
  const message = data.customMessage || 
    `Chers parents,\n\nNous vous informons que votre enfant ${data.studentName} du groupe ${data.groupName} a été marqué absent(e) le ${data.date}.\n\nPour toute information, veuillez contacter l'administration.`;

  return sendWhatsAppMessage({
    organizationId: data.organizationId,
    to: data.parentPhone,
    message,
  });
}

/**
 * Get WhatsApp session status
 */
export async function getSessionStatus(organizationId: string): Promise<{
  isConnected: boolean;
  phone?: string;
  lastConnected?: string;
  qrCode?: string;
}> {
  const db = getDbContext();
  
  const orgResult = await db.query<{ whatsappConnected: number; whatsappPhone: string }>(
    `SELECT whatsappConnected, whatsappPhone FROM organizations WHERE id = ?`,
    [organizationId]
  );

  if (orgResult.length === 0) {
    return { isConnected: false };
  }

  const org = orgResult[0];
  return {
    isConnected: org.whatsappConnected === 1,
    phone: org.whatsappPhone,
  };
}

/**
 * Create or update WhatsApp session
 */
export async function updateSession(data: {
  organizationId: string;
  sessionId: string;
  isConnected: boolean;
  phone?: string;
  name?: string;
  qrCode?: string;
  sessionData?: string;
}): Promise<void> {
  const db = getDbContext();
  
  // Update organization WhatsApp status directly
  await db.execute(
    `UPDATE organizations SET 
          whatsappConnected = ?,
          whatsappPhone = COALESCE(?, whatsappPhone),
          whatsappSessionId = COALESCE(?, whatsappSessionId),
          updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?`,
    [data.isConnected ? 1 : 0, data.phone || null, data.sessionId, data.organizationId]
  );
}

/**
 * Generate QR code for WhatsApp connection
 */
export async function generateQRForOrganization(organizationId: string): Promise<string> {
  // Returns a session ID that will be used for the connection
  const sessionId = `wa_${organizationId}_${Date.now()}`;
  return sessionId;
}
