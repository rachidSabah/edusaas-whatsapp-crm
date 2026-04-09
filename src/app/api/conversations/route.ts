export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

interface Conversation {
  id: string;
  organizationId: string;
  contactId: string;
  status: string;
  priority: string;
  assignedToId: string | null;
  aiEnabled: number;
  lastAiReply: string | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  contactName: string | null;
  contactPhone: string | null;
  assignedToName: string | null;
}

// Get conversations
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ conversations: [] });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build SQL query
    let sql = `SELECT c.*, 
               co.name as contactName, co.phone as contactPhone,
               u.name as assignedToName
               FROM conversations c
               LEFT JOIN contacts co ON c.contactId = co.id
               LEFT JOIN users u ON c.assignedToId = u.id
               WHERE c.organizationId = ?`;
    const args: any[] = [user.organizationId];

    if (status) {
      sql += ` AND c.status = ?`;
      args.push(status);
    }

    if (category) {
      sql += ` AND c.category = ?`;
      args.push(category);
    }

    sql += ` ORDER BY c.lastMessageAt DESC, c.createdAt DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const rows = await db.query<Conversation>(sql, args);

    // Format conversations
    const conversations = rows.map(row => ({
      id: row.id,
      organizationId: row.organizationId,
      contactId: row.contactId,
      status: row.status,
      priority: row.priority,
      assignedToId: row.assignedToId,
      aiEnabled: row.aiEnabled,
      lastAiReply: row.lastAiReply,
      category: row.category,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastMessageAt: row.lastMessageAt,
      contact: {
        id: row.contactId,
        name: row.contactName,
        phone: row.contactPhone,
        tags: [], // Tags not available in this query
      },
      assignedTo: row.assignedToId ? { id: row.assignedToId, name: row.assignedToName } : null,
    }));

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Create conversation or send message
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
    const { conversationId, message, contactId, category, aiEnabled, assignedToId } = body;

    // SCENARIO 1: Sending a message to an existing conversation
    if (conversationId && message) {
      // 1. Get contact phone number from conversationId
      const convResult = await db.query<{ contactId: string }>(
        `SELECT contactId FROM conversations WHERE id = ? AND organizationId = ?`,
        [conversationId, user.organizationId]
      );

      if (convResult.length === 0) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      const contactResult = await db.query<{ phone: string }>(
        `SELECT phone FROM contacts WHERE id = ? AND organizationId = ?`,
        [convResult[0].contactId, user.organizationId]
      );

      if (contactResult.length === 0) {
        return NextResponse.json({ error: 'Contact not found for this conversation' }, { status: 404 });
      }

      const contactPhone = contactResult[0].phone;

      // 2. Send WhatsApp message (this also saves the message to DB)
      const sendResult = await sendWhatsAppMessage({
        organizationId: user.organizationId,
        to: contactPhone,
        message: message,
      });

      if (!sendResult.success) {
        return NextResponse.json({ error: sendResult.error || 'Failed to send message' }, { status: 500 });
      }
      
      // The message is already created inside sendWhatsAppMessage, we can just return success.
      // Let's return the message ID.
      return NextResponse.json({ success: true, messageId: sendResult.messageId });
    }

    // SCENARIO 2: Creating a new conversation
    if (contactId) {
        // Check if conversation already exists for this contact
      const existing = await db.query<{ id: string }>(
        `SELECT id FROM conversations WHERE organizationId = ? AND contactId = ? AND status = 'active'`,
        [user.organizationId, contactId]
      );

      if (existing.length > 0) {
        // Return existing conversation
        const existingConv = await db.query<Conversation>(
          `SELECT c.*, co.name as contactName, co.phone as contactPhone
                FROM conversations c
                LEFT JOIN contacts co ON c.contactId = co.id
                WHERE c.id = ?`,
          [existing[0].id]
        );
        return NextResponse.json({ conversation: existingConv[0] });
      }

      const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      await db.execute(
        `INSERT INTO conversations (id, organizationId, contactId, category, aiEnabled, assignedToId, status, priority)
              VALUES (?, ?, ?, ?, ?, ?, 'active', 'normal')`,
        [
          id,
          user.organizationId,
          contactId,
          category || null,
          aiEnabled !== false ? 1 : 0,
          assignedToId || null,
        ]
      );

      // Fetch the created conversation
      const result = await db.query<Conversation>(
        `SELECT c.*, co.name as contactName, co.phone as contactPhone
              FROM conversations c
              LEFT JOIN contacts co ON c.contactId = co.id
              WHERE c.id = ?`,
        [id]
      );

      const conversation = result[0];

      return NextResponse.json({ conversation });
    }

    return NextResponse.json(
      { error: 'Invalid request. Provide either {conversationId, message} or {contactId}.' },
      { status: 400 }
    );

  } catch (error) {
    console.error('API /conversations POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Update conversation
export async function PUT(request: NextRequest) {
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
    const { id, status, priority, assignedToId, aiEnabled, category } = body;

    // Verify conversation belongs to organization
    const check = await db.query<{ id: string }>(
      `SELECT id FROM conversations WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    await db.execute(
      `UPDATE conversations SET 
            status = COALESCE(?, status),
            priority = COALESCE(?, priority),
            assignedToId = COALESCE(?, assignedToId),
            aiEnabled = COALESCE(?, aiEnabled),
            category = COALESCE(?, category),
            updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
      [status, priority, assignedToId, aiEnabled, category, id]
    );

    // Fetch updated conversation
    const result = await db.query<Conversation>(
      `SELECT c.*, co.name as contactName, co.phone as contactPhone
            FROM conversations c
            LEFT JOIN contacts co ON c.contactId = co.id
            WHERE c.id = ?`,
      [id]
    );

    const conversation = result[0];

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Update conversation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
