export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getDbContext } from '@/lib/db-context';

/**
 * Webhook endpoint for WhatsApp Business API
 * URL: https://admin.cabincrew.academy/api/webhook
 * 
 * GET: Webhook verification from Meta
 * POST: Incoming messages from WhatsApp
 */

// GET Request: Meta uses this to verify your webhook URL is working
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    console.log('Webhook verification request received:', { mode, token: token ? '***' : 'missing', challenge: challenge ? '***' : 'missing' });

    if (!mode || !token || !challenge) {
      console.warn('Missing required webhook verification parameters');
      return new NextResponse('Forbidden: Missing parameters', { status: 403 });
    }

    if (mode !== 'subscribe') {
      return new NextResponse('Forbidden: Invalid mode', { status: 403 });
    }

    try {
      // Get all webhook configurations to find matching token
      const db = getDbContext();
      const configs = await db.query<{
        organizationId: string;
        verifyToken: string;
      }>(
        `SELECT organizationId, verifyToken FROM webhook_config WHERE verifyToken = ?`,
        [token]
      );

      if (configs.length === 0) {
        console.warn('Invalid verify token received');
        return new NextResponse('Forbidden: Invalid Token', { status: 403 });
      }

      console.log('WEBHOOK_VERIFIED successfully for organization:', configs[0].organizationId);
      // Meta requires us to return the challenge string as plain text
      return new NextResponse(challenge, { status: 200 });
    } catch (dbError) {
      console.error('Database error during verification:', dbError);
      // If database fails, try a fallback verification with environment variable
      const envToken = process.env.WHATSAPP_VERIFY_TOKEN;
      if (envToken && token === envToken) {
        console.log('WEBHOOK_VERIFIED using environment token');
        return new NextResponse(challenge, { status: 200 });
      }
      return new NextResponse('Forbidden: Token verification failed', { status: 403 });
    }
  } catch (error) {
    console.error('Webhook verification error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST Request: Meta sends the actual WhatsApp messages here
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('Webhook POST received:', JSON.stringify(body, null, 2));

    // Meta sends messages in this structure
    if (body.object !== 'whatsapp_business_account') {
      console.warn('Invalid webhook object type:', body.object);
      return new NextResponse('OK', { status: 200 }); // Return 200 to acknowledge receipt
    }

    const entry = body.entry?.[0];
    if (!entry) {
      console.warn('No entry in webhook payload');
      return new NextResponse('OK', { status: 200 });
    }

    const changes = entry.changes?.[0];
    if (!changes) {
      console.warn('No changes in webhook payload');
      return new NextResponse('OK', { status: 200 });
    }

    const value = changes.value;

    // Process incoming messages
    if (value.messages) {
      for (const message of value.messages) {
        console.log('Processing incoming message:', {
          from: message.from,
          type: message.type,
          timestamp: message.timestamp,
        });

        // Handle different message types
        if (message.type === 'text') {
          const text = message.text?.body;
          console.log('Text message received from', message.from, ':', text);

          // TODO: Process message with AI and send auto-response
          // Call your AI function here
        } else if (message.type === 'image') {
          console.log('Image message received from', message.from);
        } else if (message.type === 'document') {
          console.log('Document message received from', message.from);
        }
      }
    }

    // Process message status updates
    if (value.statuses) {
      for (const status of value.statuses) {
        console.log('Message status update:', {
          messageId: status.id,
          status: status.status,
          timestamp: status.timestamp,
        });

        // Update message status in database
        // TODO: Store status update in database
      }
    }

    // Always return 200 OK to acknowledge receipt
    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook POST error:', error);
    // Return 200 anyway to prevent Meta from retrying
    return new NextResponse('OK', { status: 200 });
  }
}
