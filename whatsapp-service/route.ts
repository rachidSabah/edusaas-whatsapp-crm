import { NextResponse } from 'next/server';

// REQUIRED FOR CLOUDFLARE PAGES
export const runtime = 'edge'; 

// You will put this same exact string into the Meta Dashboard later
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'my_super_secret_verify_token_123';

// 1. GET Request: Meta uses this to verify your webhook URL is working
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Check if a request is from Meta and the token matches
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED successfully!');
    // Meta requires us to return the challenge string as plain text
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse('Forbidden: Invalid Token', { status: 403 });
  }
}

// 2. POST Request: Meta sends the actual WhatsApp messages here
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verify this is a WhatsApp API event
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          const message = change.value.messages?.[0];
          const contact = change.value.contacts?.[0];

          if (message) {
            console.log('🔔 New WhatsApp Message Received!');
            console.log('From Phone Number:', contact?.wa_id);
            console.log('Message Content:', message.text?.body);
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