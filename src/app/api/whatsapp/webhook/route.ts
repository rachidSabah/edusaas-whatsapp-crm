export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { processIncomingMessage, updateSession } from '@/lib/whatsapp';
import db from '@/lib/db';

// WhatsApp webhook endpoint for receiving messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate webhook secret
    const webhookSecret = request.headers.get('x-webhook-secret');
    if (webhookSecret !== process.env.WHATSAPP_WEBHOOK_SECRET && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    const { type, data } = body;

    switch (type) {
      case 'message':
        // Process incoming message
        const result = await processIncomingMessage({
          organizationId: data.organizationId,
          from: data.from,
          message: data.message,
          messageId: data.messageId,
          mediaUrl: data.mediaUrl,
          mediaType: data.mediaType,
        });

        return NextResponse.json({
          success: true,
          reply: result.reply,
          conversationId: result.conversationId,
        });

      case 'session_update':
        // Update session status
        await updateSession({
          organizationId: data.organizationId,
          sessionId: data.sessionId,
          isConnected: data.isConnected,
          phone: data.phone,
          name: data.name,
          qrCode: data.qrCode,
          sessionData: data.sessionData,
        });

        return NextResponse.json({ success: true });

      case 'status':
        // Message status update (delivered, read, etc.)
        if (data.messageId && data.status) {
          await db.execute({
            sql: `UPDATE messages SET status = ? WHERE whatsappId = ?`,
            args: [data.status, data.messageId],
          });
        }

        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: 'Unknown webhook type' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Get WhatsApp session status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Get organization WhatsApp status
    const orgResult = await db.execute({
      sql: `SELECT whatsappConnected, whatsappPhone FROM organizations WHERE id = ?`,
      args: [organizationId],
    });

    const organization = orgResult.rows[0];

    return NextResponse.json({
      isConnected: organization?.whatsappConnected === 1 || false,
      phone: organization?.whatsappPhone || null,
    });
  } catch (error) {
    console.error('Get WhatsApp status error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
