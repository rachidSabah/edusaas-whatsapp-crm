export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface Contact {
  id: string;
  organizationId: string;
  phone: string;
  name: string | null;
  email: string | null;
  tags: string | null;
  customFields: string | null;
  source: string | null;
  leadStatus: string | null;
  createdAt: string;
  updatedAt: string;
  lastContactAt: string | null;
  conversationCount?: number;
}

// Get contacts
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({
        contacts: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build SQL query
    let sql = `SELECT c.*,
               (SELECT COUNT(*) FROM conversations conv WHERE conv.contactId = c.id) as conversationCount
               FROM contacts c
               WHERE c.organizationId = ?`;
    const args: any[] = [user.organizationId];

    if (tag) {
      sql += ` AND c.tags LIKE ?`;
      args.push(`%${tag}%`);
    }

    if (search) {
      sql += ` AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)`;
      const searchPattern = `%${search}%`;
      args.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY c.lastContactAt DESC, c.createdAt DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const rows = await db.query<Contact>(sql, args);

    // Get total count
    let countSql = `SELECT COUNT(*) as count FROM contacts WHERE organizationId = ?`;
    const countArgs: any[] = [user.organizationId];

    if (tag) {
      countSql += ` AND tags LIKE ?`;
      countArgs.push(`%${tag}%`);
    }

    if (search) {
      countSql += ` AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${search}%`;
      countArgs.push(searchPattern, searchPattern, searchPattern);
    }

    const countRows = await db.query<{ count: number }>(countSql, countArgs);
    const total = countRows[0]?.count || 0;

    // Format contacts - parse tags as array
    const contacts = rows.map(row => ({
      id: row.id,
      organizationId: row.organizationId,
      phone: row.phone,
      name: row.name,
      email: row.email,
      tags: row.tags ? (typeof row.tags === 'string' ? row.tags.split(',').filter(Boolean) : row.tags) : [],
      customFields: row.customFields,
      source: row.source,
      leadStatus: row.leadStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastContactAt: row.lastContactAt,
      _count: {
        conversations: row.conversationCount || 0,
      },
    }));

    return NextResponse.json({
      contacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Create contact
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
    const { phone, name, email, tags, source } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Check if contact exists
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM contacts WHERE organizationId = ? AND phone = ?`,
      [user.organizationId, phone]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Contact with this phone already exists' },
        { status: 400 }
      );
    }

    const id = `contact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const tagsStr = tags ? (Array.isArray(tags) ? tags.join(',') : tags) : 'PROSPECT';

    await db.execute(
      `INSERT INTO contacts (id, organizationId, phone, name, email, tags, source)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, user.organizationId, phone, name || null, email || null, tagsStr, source || null]
    );

    // Fetch the created contact
    const result = await db.query<Contact>(`SELECT * FROM contacts WHERE id = ?`, [id]);

    const contact = result[0];

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Create contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Update contact
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
    const { id, name, email, tags, leadStatus } = body;

    // Verify contact belongs to organization
    const check = await db.query<{ id: string }>(
      `SELECT id FROM contacts WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    const tagsStr = tags ? (Array.isArray(tags) ? tags.join(',') : tags) : null;

    await db.execute(
      `UPDATE contacts SET 
            name = COALESCE(?, name),
            email = COALESCE(?, email),
            tags = COALESCE(?, tags),
            leadStatus = COALESCE(?, leadStatus),
            updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
      [name, email, tagsStr, leadStatus, id]
    );

    // Fetch updated contact
    const result = await db.query<Contact>(`SELECT * FROM contacts WHERE id = ?`, [id]);

    const contact = result[0];

    return NextResponse.json({ contact });
  } catch (error) {
    console.error('Update contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Delete contact
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
        { error: 'Contact ID is required' },
        { status: 400 }
      );
    }

    // Verify contact belongs to organization
    const check = await db.query<{ id: string }>(
      `SELECT id FROM contacts WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      );
    }

    await db.execute(`DELETE FROM contacts WHERE id = ?`, [id]);

    return NextResponse.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Delete contact error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
