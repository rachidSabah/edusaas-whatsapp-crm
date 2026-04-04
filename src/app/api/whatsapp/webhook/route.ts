import { NextResponse, NextRequest } from 'next/server';
import { processIncomingMessage } from '@/lib/whatsapp';
import { getDbContext } from '@/lib/db-hybrid';

// REQUIRED FOR CLOUDFLARE PAGES: This tells Next.js to use the Edge runtime instead of Node.js
export const runtime = 'edge';

// 1. GET Request: Meta uses this to verify your webhook URL is working
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    if (!mode || !token || !challenge) {
      console.warn('Missing required webhook verification parameters');
      return new NextResponse('Forbidden: Missing parameters', { status: 403 });
    }

    if (mode !== 'subscribe') {
      return new NextResponse('Forbidden: Invalid mode', { status: 403 });
    }

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
      console.warn('Invalid verify token received:', token);
      return new NextResponse('Forbidden: Invalid Token', { status: 403 });
    }

    console.log('WEBHOOK_VERIFIED successfully for organization:', configs[0].organizationId);
    // Meta requires us to return the challenge string as plain text
    return new NextResponse(challenge, { status: 200 });
  } catch (error) {
    console.error('Webhook verification error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// 2. POST Request: Meta sends the actual WhatsApp messages here
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verify this is a WhatsApp API event
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const message = change.value.messages?.[0];
          const contact = change.value.contacts?.[0];
          const metadata = change.value.metadata;

          if (message && contact && metadata) {
            console.log('🔔 New WhatsApp Message Received!');
            console.log('From Phone Number:', contact?.wa_id);
            console.log('Message Content:', message.text?.body);
            
            try {
              const db = getDbContext();
              
              // 1. Try to find the organization using this phone number
              const orgs = await db.query<{id: string}>(
                `SELECT id FROM organizations WHERE whatsappPhone = ? OR whatsappSessionId = ? LIMIT 1`,
                [metadata.display_phone_number, metadata.phone_number_id]
              );
              
              // Fallback to the first organization for testing purposes if none match
              const organizationId = orgs[0]?.id || (await db.query<{id: string}>(`SELECT id FROM organizations LIMIT 1`))[0]?.id;
              
              if (organizationId) {
                // 2. Save the message to the database
                await processIncomingMessage({
                  organizationId,
                  from: contact.wa_id,
                  message: message.text?.body || '',
                  messageId: message.id,
                  mediaType: message.type,
                });
                console.log('✅ Message successfully saved to database!');
              }
            } catch (dbError) {
              console.error('Database error while saving message:', dbError);
            }
          }
        }
      }
      
      // We must always return a 200 OK so Meta knows we received the message
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    } else {
      return new NextResponse('Not a WhatsApp event', { status: 404 });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}