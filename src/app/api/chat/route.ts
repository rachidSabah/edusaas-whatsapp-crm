export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

interface ChatMessage {
  id: string;
  organizationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  receiverId: string | null;
  receiverName: string | null;
  content: string;
  createdAt: string;
  isRead: number;
}

interface ChatUser {
  id: string;
  name: string;
  role: string;
  email: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
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
      const users = await db.query<ChatUser>(
        `SELECT id, name, role, email FROM users 
         WHERE organizationId = ? AND id != ? AND isActive = 1
         ORDER BY name ASC`,
        [user.organizationId, user.id]
      );

      // Get unread counts and last messages for each user
      for (const chatUser of users) {
        // Unread count (messages from this user to current user)
        const unreadResult = await db.query<{ count: number }>(
          `SELECT COUNT(*) as count FROM chat_messages 
           WHERE organizationId = ? AND senderId = ? AND receiverId = ? AND isRead = 0`,
          [user.organizationId, chatUser.id, user.id]
        );
        chatUser.unreadCount = unreadResult[0]?.count || 0;

        // Last message
        const lastMsgResult = await db.query<{ content: string; createdAt: string }>(
          `SELECT content, createdAt FROM chat_messages 
           WHERE organizationId = ? 
           AND ((senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?))
           ORDER BY createdAt DESC LIMIT 1`,
          [user.organizationId, chatUser.id, user.id, user.id, chatUser.id]
        );
        if (lastMsgResult.length > 0) {
          chatUser.lastMessage = lastMsgResult[0].content.substring(0, 50);
          chatUser.lastMessageTime = lastMsgResult[0].createdAt;
        }
      }

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

      // Add isCurrentUser flag
      const formattedMessages = messages.map(msg => ({
        ...msg,
        isCurrentUser: msg.senderId === user.id
      }));

      return NextResponse.json({ messages: formattedMessages });
    }

    // Get all conversations summary (for admin)
    const conversations = await db.query<{
      otherUserId: string;
      otherUserName: string;
      otherUserRole: string;
      lastMessage: string;
      lastMessageTime: string;
      unreadCount: number;
    }>(
      `WITH all_messages AS (
        SELECT 
          CASE WHEN senderId = ? THEN receiverId ELSE senderId END as otherUserId,
          CASE WHEN senderId = ? THEN receiverName ELSE senderName END as otherUserName,
          CASE WHEN senderId = ? THEN 
            (SELECT role FROM users WHERE id = receiverId)
          ELSE senderRole END as otherUserRole,
          content,
          createdAt,
          CASE WHEN senderId != ? AND isRead = 0 THEN 1 ELSE 0 END as isUnread
        FROM chat_messages
        WHERE organizationId = ? AND (senderId = ? OR receiverId = ?)
      )
      SELECT 
        otherUserId,
        otherUserName,
        otherUserRole,
        content as lastMessage,
        MAX(createdAt) as lastMessageTime,
        SUM(isUnread) as unreadCount
      FROM all_messages
      GROUP BY otherUserId
      ORDER BY lastMessageTime DESC`,
      [user.id, user.id, user.id, user.id, user.organizationId, user.id, user.id]
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Get chat messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// SEND message
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'Aucune organisation associée' }, { status: 400 });
    }

    const body = await request.json() as {
      content: string;
      receiverId: string;
    };
    const { content, receiverId } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Le message ne peut pas être vide' }, { status: 400 });
    }

    if (!receiverId) {
      return NextResponse.json({ error: 'Destinataire requis' }, { status: 400 });
    }

    // Verify receiver exists and is in same organization
    const receiver = await db.query<{ id: string; name: string }>(
      `SELECT id, name FROM users WHERE id = ? AND organizationId = ? AND isActive = 1`,
      [receiverId, user.organizationId]
    );

    if (receiver.length === 0) {
      return NextResponse.json({ error: 'Destinataire non trouvé' }, { status: 404 });
    }

    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.execute(
      `INSERT INTO chat_messages 
       (id, organizationId, senderId, senderName, senderRole, receiverId, receiverName, content, createdAt, isRead)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 0)`,
      [
        id,
        user.organizationId,
        user.id,
        user.name,
        user.role,
        receiverId,
        receiver[0].name,
        content.trim()
      ]
    );

    const result = await db.query<ChatMessage>(
      `SELECT * FROM chat_messages WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ 
      message: {
        ...result[0],
        isCurrentUser: true
      }
    });
  } catch (error) {
    console.error('Send chat message error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Get unread count
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ unreadCount: 0 });
    }

    const count = await db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM chat_messages 
       WHERE organizationId = ? AND receiverId = ? AND isRead = 0`,
      [user.organizationId, user.id]
    );

    return NextResponse.json({ unreadCount: count[0]?.count || 0 });
  } catch (error) {
    console.error('Get unread count error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
