export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';
import { sendWhatsAppMessage, type WhatsAppConfig } from '@/modules/whatsapp';

interface Template {
  id: string;
  name: string;
  category: string;
  content: string;
  signature: string | null;
  isSystem: number;
  organizationId: string | null;
}

// Replace template variables with actual values
function processTemplateContent(
  content: string,
  signature: string | null,
  variables: Record<string, string>
): string {
  let processed = content;
  
  // Replace all variables in the template
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    processed = processed.replace(regex, value);
  }
  
  // Add signature
  if (signature) {
    const processedSignature = signature.replace(
      /\{organisation\}/g, 
      variables.organisation || 'Administration'
    );
    processed += `\n${processedSignature}`;
  }
  
  return processed;
}

// Get template for a trigger action
async function getTemplateForAction(
  db: ReturnType<typeof getDbContext>,
  organizationId: string,
  triggerAction: string
): Promise<Template | null> {
  // First, check for organization-specific template
  const orgTemplates = await db.query<Template>(
    `SELECT * FROM templates WHERE organizationId = ? AND triggerAction = ? AND isActive = 1 LIMIT 1`,
    [organizationId, triggerAction]
  );
  
  if (orgTemplates.length > 0) {
    return orgTemplates[0];
  }
  
  // Fall back to system template
  const systemTemplates = await db.query<Template>(
    `SELECT * FROM templates WHERE isSystem = 1 AND triggerAction = ? AND isActive = 1 LIMIT 1`,
    [triggerAction]
  );
  
  return systemTemplates.length > 0 ? systemTemplates[0] : null;
}

// Send WhatsApp message endpoint
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

    const body = await request.json() as {
      to?: string;
      templateId?: string;
      triggerAction?: string;
      variables?: Record<string, string>;
      message?: string;
    };
    const { 
      to, 
      templateId, 
      triggerAction,
      variables,
      message 
    } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Get WhatsApp configuration for this organization
    const waConfigs = await db.query<{
      id: string;
      provider: string;
      apiUrl: string;
      apiKey: string;
      instanceId: string | null;
    }>(
      `SELECT id, provider, apiUrl, apiKey, instanceId 
       FROM whatsapp_accounts 
       WHERE organizationId = ? AND isActive = 1 AND isDefault = 1 
       ORDER BY createdAt DESC LIMIT 1`,
      [user.organizationId]
    );

    // Get organization info
    const orgResult = await db.query<{ name: string }>(
      `SELECT name FROM organizations WHERE id = ?`,
      [user.organizationId]
    );
    const orgName = orgResult[0]?.name || 'Administration';

    let finalMessage = message;

    // If using template
    if (templateId || triggerAction) {
      let template: Template | null = null;

      if (triggerAction) {
        template = await getTemplateForAction(db, user.organizationId, triggerAction);
      } else if (templateId) {
        const templates = await db.query<Template>(
          `SELECT * FROM templates WHERE id = ? AND isActive = 1`,
          [templateId]
        );
        template = templates.length > 0 ? templates[0] : null;
      }

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      // Add organization name to variables
      const allVariables = {
        ...variables,
        organisation: orgName
      };

      finalMessage = processTemplateContent(
        template.content,
        template.signature,
        allVariables
      );
    }

    if (!finalMessage) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Find or create contact
    let contactId: string;
    const contacts = await db.query<{ id: string }>(
      `SELECT id FROM contacts WHERE organizationId = ? AND phone LIKE ?`,
      [user.organizationId, `%${to}%`]
    );

    if (contacts.length > 0) {
      contactId = contacts[0].id;
    } else {
      // Create new contact
      contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.execute(
        `INSERT INTO contacts (id, organizationId, phone, tags, createdAt, updatedAt) 
         VALUES (?, ?, ?, 'PARENT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [contactId, user.organizationId, to]
      );
    }

    // Find or create conversation
    let conversationId: string;
    const conversations = await db.query<{ id: string }>(
      `SELECT id FROM conversations 
       WHERE organizationId = ? AND contactId = ? AND status IN ('active', 'pending') 
       ORDER BY lastMessageAt DESC LIMIT 1`,
      [user.organizationId, contactId]
    );

    if (conversations.length > 0) {
      conversationId = conversations[0].id;
    } else {
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.execute(
        `INSERT INTO conversations (id, organizationId, contactId, status, createdAt, updatedAt) 
         VALUES (?, ?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [conversationId, user.organizationId, contactId]
      );
    }

    let sendResult = { success: false, messageId: '', error: 'Configuration introuvable' };
    
    // Send using Meta Business API Configuration
    if (waConfigs.length > 0) {
      const config = waConfigs[0];
      const waConfig: WhatsAppConfig = {
        provider: config.provider as 'evolution' | 'business-api' | 'custom',
        apiUrl: config.apiUrl,
        apiKey: config.apiKey,
        instanceId: config.instanceId || undefined,
        organizationId: user.organizationId,
      };
      
      sendResult = await sendWhatsAppMessage(waConfig, to, finalMessage);
    }

    // Store outgoing message
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.execute(
      `INSERT INTO messages (id, organizationId, conversationId, content, direction, status, createdAt) 
       VALUES (?, ?, ?, ?, 'outbound', ?, CURRENT_TIMESTAMP)`,
      [msgId, user.organizationId, conversationId, finalMessage, sendResult.success ? 'sent' : 'failed']
    );

    // Update conversation
    await db.execute(
      `UPDATE conversations 
       SET lastMessageAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [conversationId]
    );

    return NextResponse.json({ 
      success: sendResult.success,
      messageId: msgId,
      whatsappMessageId: sendResult.messageId,
      message: finalMessage,
      conversationId,
      to,
      error: sendResult.error
    });
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
