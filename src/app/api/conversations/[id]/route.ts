export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

interface Message {
  id: string;
  organizationId: string;
  conversationId: string;
  content: string;
  direction: string;
  status: string;
  mediaUrl: string | null;
  mediaType: string | null;
  isAiGenerated: number;
  senderId: string | null;
  whatsappId: string | null;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
  };
}

// Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const db = getDbContext();
    const conversationId = params.id;

    if (!user.organizationId) {
      return NextResponse.json({ messages: [] });
    }

    // Verify conversation belongs to organization
    const conversationCheck = await db.query<{ id: string }>(
      `SELECT id FROM conversations WHERE id = ? AND organizationId = ?`,
      [conversationId, user.organizationId]
    );

    if (conversationCheck.length === 0) {
      return NextResponse.json({ messages: [] });
    }

    // Fetch messages
    const messages = await db.query<Message>(
      `SELECT m.*, u.name as senderName
       FROM messages m
       LEFT JOIN users u ON m.senderId = u.id
       WHERE m.conversationId = ?
       ORDER BY m.createdAt ASC
       LIMIT 100`,
      [conversationId]
    );

    // Format messages with sender info
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      organizationId: msg.organizationId,
      conversationId: msg.conversationId,
      content: msg.content,
      direction: msg.direction,
      status: msg.status,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      isAiGenerated: msg.isAiGenerated === 1,
      senderId: msg.senderId,
      whatsappId: msg.whatsappId,
      createdAt: msg.createdAt,
      sender: msg.senderId ? {
        id: msg.senderId,
        name: msg.senderName || 'Unknown'
      } : undefined
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Update conversation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const db = getDbContext();
    const conversationId = params.id;

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, priority, assignedToId, aiEnabled, category } = body;

    // Verify conversation belongs to organization
    const check = await db.query<{ id: string }>(
      `SELECT id FROM conversations WHERE id = ? AND organizationId = ?`,
      [conversationId, user.organizationId]
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
      [status, priority, assignedToId, aiEnabled, category, conversationId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update conversation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Delete conversation (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const db = getDbContext();
    const conversationId = params.id;

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    // Verify conversation belongs to organization
    const check = await db.query<{ id: string }>(
      `SELECT id FROM conversations WHERE id = ? AND organizationId = ?`,
      [conversationId, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Soft delete
    await db.execute(
      `UPDATE conversations SET status = 'archived', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [conversationId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
