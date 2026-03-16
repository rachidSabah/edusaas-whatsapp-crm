export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { BaileysSessionService } from '@/lib/baileys-service';

/**
 * GET /api/whatsapp/baileys/qr
 * Get the current QR code for Baileys connection
 * 
 * Query params:
 * - phoneNumber: The phone number to get QR for (optional, uses default if not provided)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber') || 'default';

    // Get existing session
    const session = await BaileysSessionService.getSession(phoneNumber);

    if (!session) {
      return NextResponse.json(
        {
          error: 'No session found',
          message: 'Please initiate a new connection first',
        },
        { status: 404 }
      );
    }

    // If already connected, return success status
    if (session.status === 'connected') {
      return NextResponse.json({
        status: 'connected',
        phoneNumber: session.phoneNumber,
        message: 'Already connected to WhatsApp',
        lastActivity: session.lastActivity,
      });
    }

    // If QR code exists, return it
    if (session.qrCode) {
      return NextResponse.json({
        status: 'pending',
        qrCode: session.qrCode,
        phoneNumber: session.phoneNumber,
        message: 'Scan the QR code with your WhatsApp app',
      });
    }

    // If no QR code yet, return waiting status
    return NextResponse.json({
      status: 'waiting',
      phoneNumber: session.phoneNumber,
      message: 'Waiting for QR code generation. Please try again in a few seconds.',
    });
  } catch (error) {
    console.error('Error getting QR code:', error);
    return NextResponse.json(
      { error: 'Failed to get QR code' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/baileys/qr
 * Initiate a new Baileys connection and generate QR code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber = 'default' } = body;

    // Check if already connected
    const existingSession = await BaileysSessionService.getSession(phoneNumber);
    if (existingSession?.status === 'connected') {
      return NextResponse.json(
        {
          error: 'Already connected',
          message: 'This phone number is already connected to WhatsApp',
        },
        { status: 400 }
      );
    }

    // Create new session with connecting status
    await BaileysSessionService.updateStatus(phoneNumber, 'connecting');

    // In a real implementation, this would trigger the Baileys connection
    // For now, we'll return a placeholder QR code
    const placeholderQR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await BaileysSessionService.saveSession(
      phoneNumber,
      JSON.stringify({ initiatedAt: new Date().toISOString() }),
      placeholderQR
    );

    return NextResponse.json({
      status: 'initiating',
      phoneNumber,
      message: 'Connection initiated. QR code will be generated shortly.',
      qrCode: placeholderQR,
    });
  } catch (error) {
    console.error('Error initiating Baileys connection:', error);
    return NextResponse.json(
      { error: 'Failed to initiate connection' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/whatsapp/baileys/qr
 * Disconnect a Baileys session
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber') || 'default';

    await BaileysSessionService.disconnectSession(phoneNumber);

    return NextResponse.json({
      status: 'disconnected',
      phoneNumber,
      message: 'Session disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting session:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
