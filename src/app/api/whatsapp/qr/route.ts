export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

/**
 * WhatsApp QR Code Generation Endpoint
 * Generates and returns QR code for Baileys connection
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get account
    const accounts = await db.query<{
      id: string;
      phoneNumber: string;
      connectionStatus: string;
      sessionToken: string | null;
    }>(
      `SELECT id, phoneNumber, connectionStatus, sessionToken 
       FROM whatsapp_accounts 
       WHERE id = ? AND organizationId = ?`,
      [accountId, user.organizationId]
    );

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    const account = accounts[0];

    // Generate session token if not exists
    let sessionToken = account.sessionToken;
    if (!sessionToken) {
      sessionToken = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await db.execute(
        `UPDATE whatsapp_accounts SET sessionToken = ? WHERE id = ?`,
        [sessionToken, accountId]
      );
    }

    // Return QR code data (in production, this would generate actual QR code)
    // For testing/demo purposes, we'll simulate a connection after 10 seconds
    const isConnecting = account.connectionStatus === 'connecting';
    
    return NextResponse.json({
      success: true,
      sessionToken,
      accountId,
      phoneNumber: account.phoneNumber,
      connectionStatus: account.connectionStatus,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(sessionToken)}`,
      message: 'Scannez le code QR avec votre application WhatsApp',
    });
  } catch (error: any) {
    console.error('WhatsApp QR generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to update QR code status
 */
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
    const { accountId, status, sessionData } = body;

    if (!accountId || !status) {
      return NextResponse.json(
        { error: 'Account ID and status are required' },
        { status: 400 }
      );
    }

    // Update account status
    await db.execute(
      `UPDATE whatsapp_accounts 
       SET connectionStatus = ?, sessionData = ?, lastConnected = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ? AND organizationId = ?`,
      [status, sessionData || null, accountId, user.organizationId]
    );

    return NextResponse.json({
      success: true,
      message: `Account status updated to ${status}`,
    });
  } catch (error: any) {
    console.error('WhatsApp QR status update error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
