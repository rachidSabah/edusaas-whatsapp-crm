export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

/**
 * Get all knowledge base items
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

    const items = await db.query<{
      id: string;
      question: string;
      answer: string;
      category: string;
      source: string;
      sourceFile: string | null;
      createdAt: string;
    }>(
      `SELECT id, question, answer, category, source, sourceFile, createdAt
       FROM knowledge_base
       WHERE organizationId = ?
       ORDER BY createdAt DESC`,
      [user.organizationId]
    );

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error('Get knowledge base error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Add or update knowledge base item
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
    const { question, answer, category = 'General' } = body;

    if (!question || !answer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const id = `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.execute(
      `INSERT INTO knowledge_base 
       (id, organizationId, question, answer, category, source)
       VALUES (?, ?, ?, ?, ?, 'manual')`,
      [id, user.organizationId, question, answer, category]
    );

    return NextResponse.json({
      success: true,
      message: 'Item added successfully',
      id,
    });
  } catch (error: any) {
    console.error('Add knowledge base item error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Update knowledge base item
 */
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing item ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { question, answer, category } = body;

    await db.execute(
      `UPDATE knowledge_base 
       SET question = ?, answer = ?, category = ?
       WHERE id = ? AND organizationId = ?`,
      [question, answer, category, id, user.organizationId]
    );

    return NextResponse.json({
      success: true,
      message: 'Item updated successfully',
    });
  } catch (error: any) {
    console.error('Update knowledge base item error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Delete knowledge base item
 */
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
        { error: 'Missing item ID' },
        { status: 400 }
      );
    }

    await db.execute(
      `DELETE FROM knowledge_base WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete knowledge base item error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
