export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

interface KnowledgeEntry {
  id: string;
  organizationId: string;
  question: string;
  answer: string;
  category: string;
  keywords: string | null;
  priority: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// Get knowledge base entries
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ entries: [] });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // Build SQL query
    let sql = `SELECT * FROM knowledge_base WHERE organizationId = ? AND isActive = 1`;
    const args: any[] = [user.organizationId];

    if (category) {
      sql += ` AND category = ?`;
      args.push(category);
    }

    if (search) {
      sql += ` AND (question LIKE ? OR answer LIKE ? OR keywords LIKE ?)`;
      const searchPattern = `%${search}%`;
      args.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY priority DESC, createdAt DESC`;

    const entries = await db.query<KnowledgeEntry>(sql, args);

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Get knowledge base error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Create knowledge base entry
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
    const { question, answer, category, keywords, priority } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Question and answer are required' },
        { status: 400 }
      );
    }

    const id = `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.execute(
      `INSERT INTO knowledge_base (id, organizationId, question, answer, category, keywords, priority, isActive)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        user.organizationId,
        question,
        answer,
        category || 'GENERAL',
        keywords || null,
        priority || 0,
      ]
    );

    // Fetch the created entry
    const result = await db.query<KnowledgeEntry>(`SELECT * FROM knowledge_base WHERE id = ?`, [id]);

    const entry = result[0];

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Create knowledge base error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Update knowledge base entry
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
    const { id, question, answer, category, keywords, priority, isActive } = body;

    // Verify entry belongs to organization
    const check = await db.query<{ id: string }>(
      `SELECT id FROM knowledge_base WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    await db.execute(
      `UPDATE knowledge_base SET 
            question = COALESCE(?, question),
            answer = COALESCE(?, answer),
            category = COALESCE(?, category),
            keywords = COALESCE(?, keywords),
            priority = COALESCE(?, priority),
            isActive = COALESCE(?, isActive),
            updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
      [question, answer, category, keywords, priority, isActive, id]
    );

    // Fetch updated entry
    const result = await db.query<KnowledgeEntry>(`SELECT * FROM knowledge_base WHERE id = ?`, [id]);

    const entry = result[0];

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Update knowledge base error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Delete knowledge base entry
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Entry ID is required' },
        { status: 400 }
      );
    }

    // Verify entry belongs to organization
    const check = await db.query<{ id: string }>(
      `SELECT id FROM knowledge_base WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    // Soft delete
    await db.execute(
      `UPDATE knowledge_base SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error('Delete knowledge base error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
