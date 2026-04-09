
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface ChatMessage {
  id: string;
  organizationId: string;
  senderId: string;
  senderName: string;
  receiverId: string | null;
  content: string;
  createdAt: string;
  isRead: number;
}

// GET chat messages or users list
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ messages: [], users: [] });
    }

    const { searchParams } = new URL(request.url);
    const withUser = searchParams.get('with');
    const getUsers = searchParams.get('users');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get users list for chat
    if (getUsers === 'true') {
      const users = await db.query<any>(
        `SELECT id, name, email FROM users 
         WHERE organizationId = ? AND id != ? 
         ORDER BY name ASC LIMIT 100`,
        [user.organizationId, user.id]
      );

      return NextResponse.json({ users });
    }

    // Get conversation with specific user
    if (withUser) {
      const messages = await db.query<ChatMessage>(
        `SELECT * FROM chat_messages 
         WHERE organizationId = ? 
         AND ((senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?))
         ORDER BY createdAt ASC LIMIT ?`,
        [user.organizationId, user.id, withUser, withUser, user.id, limit]
      );

      // Mark messages as read
      await db.execute(
        `UPDATE chat_messages SET isRead = 1 
         WHERE organizationId = ? AND senderId = ? AND receiverId = ? AND isRead = 0`,
        [user.organizationId, withUser, user.id]
      );

      return NextResponse.json({ messages });
    }

    // Get all messages for current user
    const messages = await db.query<ChatMessage>(
      `SELECT * FROM chat_messages 
       WHERE organizationId = ? AND (senderId = ? OR receiverId = ?)
       ORDER BY createdAt DESC LIMIT ?`,
      [user.organizationId, user.id, user.id, limit]
    );

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Chat GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat messages', details: String(error) },
      { status: 500 }
    );
  }
}

// POST send chat message
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
    const { receiverId, content } = body;

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO chat_messages (id, organizationId, senderId, senderName, receiverId, content, createdAt, isRead)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, user.organizationId, user.id, user.name || 'Unknown', receiverId, content, now]
    );

    return NextResponse.json({ id, success: true });
  } catch (error) {
    console.error('Chat POST error:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: String(error) },
      { status: 500 }
    );
  }
}
