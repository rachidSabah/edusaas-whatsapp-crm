export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface WhatsAppAccount {
  id: string;
  organizationId: string;
  phoneNumber: string;
  accountName: string | null;
  connectionStatus: string;
  sessionToken: string | null;
  sessionData: string | null;
  deviceId: string | null;
  lastConnected: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// Get WhatsApp accounts
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ accounts: [] });
    }

    const accounts = await db.query<WhatsAppAccount>(
      `SELECT id, organizationId, phoneNumber, accountName, connectionStatus, 
              deviceId, lastConnected, isActive, createdAt, updatedAt
       FROM whatsapp_accounts 
       WHERE organizationId = ? AND isActive = 1
       ORDER BY createdAt DESC`,
      [user.organizationId]
    );

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Get WhatsApp accounts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create WhatsApp account
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body = await request.json();
    const { phoneNumber, accountName } = body;

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Le numéro de téléphone est requis' }, { status: 400 });
    }

    // Check for duplicate
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM whatsapp_accounts WHERE organizationId = ? AND phoneNumber = ? AND isActive = 1`,
      [user.organizationId, phoneNumber]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Ce numéro est déjà enregistré' }, { status: 400 });
    }

    const id = `wa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const deviceId = `device_${Date.now()}`;

    await db.execute(
      `INSERT INTO whatsapp_accounts (id, organizationId, phoneNumber, accountName, connectionStatus, deviceId, isActive)
       VALUES (?, ?, ?, ?, 'disconnected', ?, 1)`,
      [id, user.organizationId, phoneNumber, accountName || null, deviceId]
    );

    const accounts = await db.query<WhatsAppAccount>(
      `SELECT id, organizationId, phoneNumber, accountName, connectionStatus, deviceId, lastConnected, isActive, createdAt, updatedAt
       FROM whatsapp_accounts WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ account: accounts[0] });
  } catch (error) {
    console.error('Create WhatsApp account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update WhatsApp account (connect/disconnect/update session)
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body = await request.json();
    const { id, accountName, connectionStatus, sessionToken, sessionData, isActive } = body;

    const check = await db.query<{ id: string }>(
      `SELECT id FROM whatsapp_accounts WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json({ error: 'Compte non trouvé' }, { status: 404 });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const args: any[] = [];

    if (accountName !== undefined) {
      updates.push('accountName = ?');
      args.push(accountName);
    }

    if (connectionStatus !== undefined) {
      updates.push('connectionStatus = ?');
      args.push(connectionStatus);
      
      // If connecting, update lastConnected
      if (connectionStatus === 'connected') {
        updates.push('lastConnected = CURRENT_TIMESTAMP');
      }
    }

    if (sessionToken !== undefined) {
      updates.push('sessionToken = ?');
      args.push(sessionToken);
    }

    if (sessionData !== undefined) {
      updates.push('sessionData = ?');
      args.push(sessionData);
    }

    if (isActive !== undefined) {
      updates.push('isActive = ?');
      args.push(isActive);
    }

    if (updates.length > 0) {
      updates.push('updatedAt = CURRENT_TIMESTAMP');
      args.push(id);
      
      await db.execute(
        `UPDATE whatsapp_accounts SET ${updates.join(', ')} WHERE id = ?`,
        args
      );
    }

    const accounts = await db.query<WhatsAppAccount>(
      `SELECT id, organizationId, phoneNumber, accountName, connectionStatus, deviceId, lastConnected, isActive, createdAt, updatedAt
       FROM whatsapp_accounts WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ account: accounts[0] });
  } catch (error) {
    console.error('Update WhatsApp account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete WhatsApp account
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    await db.execute(`UPDATE whatsapp_accounts SET isActive = 0 WHERE id = ?`, [id]);
    return NextResponse.json({ message: 'Compte supprimé avec succès' });
  } catch (error) {
    console.error('Delete WhatsApp account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
