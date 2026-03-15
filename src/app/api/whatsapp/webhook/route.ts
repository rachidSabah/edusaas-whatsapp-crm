export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getDbContext } from '@/lib/db-context';
import { createWhatsAppService, type WhatsAppConfig } from '@/modules/whatsapp';

/**
 * WhatsApp Webhook Endpoint
 * Receives messages from WhatsApp provider (Evolution API, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Log incoming webhook for debugging
    console.log('WhatsApp Webhook received:', JSON.stringify(body, null, 2));

    // Extract organization ID from webhook (could be in headers or body)
    const organizationId = request.headers.get('x-organization-id') || 
                           body.organizationId || 
                           body.instance;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Get database context
    const db = getDbContext();

    // Get WhatsApp configuration for this organization
    const configs = await db.query<{
      id: string;
      provider: string;
      apiUrl: string;
      apiKey: string;
      instanceId: string | null;
      aiEnabled: number;
    }>(
      `SELECT id, provider, apiUrl, apiKey, instanceId, aiEnabled 
       FROM whatsapp_accounts 
       WHERE organizationId = ? AND isActive = 1`,
      [organizationId]
    );

    if (configs.length === 0) {
      return NextResponse.json(
        { error: 'No WhatsApp configuration found' },
        { status: 404 }
      );
    }

    const config = configs[0];

    // Create WhatsApp service
    const waConfig: WhatsAppConfig = {
      provider: config.provider as 'evolution' | 'business-api' | 'custom',
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      instanceId: config.instanceId || undefined,
      organizationId,
      aiEnabled: config.aiEnabled === 1,
      autoReplyEnabled: config.aiEnabled === 1,
    };

    const waService = createWhatsAppService(waConfig);

    // Parse the incoming message
    const message = waService.handleWebhook(body);

    if (!message) {
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook processed (no action needed)' 
      });
    }

    // Skip messages from us (outgoing)
    if (message.isFromMe) {
      return NextResponse.json({ 
        success: true, 
        message: 'Outgoing message ignored' 
      });
    }

    // Find or create contact
    let contactId: string | null = null;
    const contacts = await db.query<{ id: string; name: string }>(
      `SELECT id, name FROM contacts WHERE organizationId = ? AND phone LIKE ?`,
      [organizationId, `%${message.from}%`]
    );

    if (contacts.length > 0) {
      contactId = contacts[0].id;
    } else {
      // Create new contact
      contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.execute(
        `INSERT INTO contacts (id, organizationId, phone, name, tags, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 'PROSPECT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [contactId, organizationId, message.from, message.from]
      );
    }

    // Store incoming message
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.execute(
      `INSERT INTO messages (id, organizationId, contactId, content, direction, status, createdAt)
       VALUES (?, ?, ?, ?, 'inbound', 'received', CURRENT_TIMESTAMP)`,
      [messageId, organizationId, contactId, message.body]
    );

    // Process with AI if enabled
    if (waConfig.aiEnabled) {
      const context = {
        message,
        organizationId,
        contact: contacts[0] ? { name: contacts[0].name, number: message.from } : undefined,
      };

      const autoReply = await waService.processIncomingMessage(context);

      if (autoReply) {
        // Send auto-reply
        await waService.sendTextMessage(message.from, autoReply);

        // Store outgoing message
        const replyId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.execute(
          `INSERT INTO messages (id, organizationId, contactId, content, direction, status, createdAt)
           VALUES (?, ?, ?, ?, 'outbound', 'sent', CURRENT_TIMESTAMP)`,
          [replyId, organizationId, contactId, autoReply]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      data: {
        messageId,
        contactId,
        autoReplied: waConfig.aiEnabled,
      }
    });
  } catch (error: any) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Webhook verification endpoint (for setup)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verify webhook token (if using WhatsApp Business API)
  if (mode === 'subscribe' && token) {
    // In production, verify the token against stored value
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({
    status: 'WhatsApp webhook endpoint active',
    timestamp: new Date().toISOString()
  });
}
