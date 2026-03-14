export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

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
    // Replace {organisation} in signature
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

    const body = await request.json();
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
          { error: 'Template non trouvé' },
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
    let contactId: string | null = null;
    const contacts = await db.query<{ id: string }>(
      `SELECT id FROM contacts WHERE organizationId = ? AND phone = ?`,
      [user.organizationId, to]
    );

    if (contacts.length > 0) {
      contactId = contacts[0].id;
    } else {
      // Create new contact
      contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.execute(
        `INSERT INTO contacts (id, organizationId, phone, tags) VALUES (?, ?, ?, 'PARENT')`,
        [contactId, user.organizationId, to]
      );
    }

    // Find or create conversation
    let conversationId: string;
    const conversations = await db.query<{ id: string }>(
      `SELECT id FROM conversations WHERE organizationId = ? AND contactId = ? AND status IN ('active', 'pending') ORDER BY lastMessageAt DESC LIMIT 1`,
      [user.organizationId, contactId]
    );

    if (conversations.length > 0) {
      conversationId = conversations[0].id;
    } else {
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.execute(
        `INSERT INTO conversations (id, organizationId, contactId, status) VALUES (?, ?, ?, 'active')`,
        [conversationId, user.organizationId, contactId]
      );
    }

    // Store outgoing message
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.execute(
      `INSERT INTO messages (id, organizationId, conversationId, content, direction, status) VALUES (?, ?, ?, ?, 'outbound', 'sent')`,
      [msgId, user.organizationId, conversationId, finalMessage]
    );

    // Update conversation
    await db.execute(
      `UPDATE conversations SET lastMessageAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [conversationId]
    );

    // In production, integrate with actual WhatsApp API here
    // For now, we simulate successful sending

    return NextResponse.json({ 
      success: true, 
      messageId: msgId,
      message: finalMessage,
      conversationId,
      to
    });
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
