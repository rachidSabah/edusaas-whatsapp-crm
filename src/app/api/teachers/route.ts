export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface Teacher {
  id: string;
  organizationId: string;
  name: string;
  email: string | null;
  phone: string | null;
  speciality: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// Get teachers
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ teachers: [] });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let sql = `SELECT * FROM teachers WHERE organizationId = ?`;
    const args: any[] = [user.organizationId];

    if (search) {
      sql += ` AND (name LIKE ? OR email LIKE ? OR speciality LIKE ?)`;
      const searchPattern = `%${search}%`;
      args.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY name ASC`;

    const teachers = await db.query<Teacher>(sql, args);
    return NextResponse.json({ teachers });
  } catch (error) {
    console.error('Get teachers error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

// Create teacher
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, phone, speciality, specialization } = body;
    
    // Accept both speciality and specialization
    const spec = speciality || specialization || null;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check for duplicate email
    if (email) {
      const existing = await db.query<{ id: string }>(
        `SELECT id FROM teachers WHERE organizationId = ? AND email = ?`,
        [user.organizationId, email]
      );
      if (existing.length > 0) {
        return NextResponse.json({ error: 'Un enseignant avec cet email existe déjà' }, { status: 400 });
      }
    }

    const id = `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO teachers (id, organizationId, name, email, phone, speciality, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, user.organizationId, name, email || null, phone || null, spec, now, now]
    );

    const teachers = await db.query<Teacher>(`SELECT * FROM teachers WHERE id = ?`, [id]);
    return NextResponse.json({ teacher: teachers[0] });
  } catch (error) {
    console.error('Create teacher error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

// Update teacher
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body = await request.json();
    const { id, name, email, phone, speciality, specialization, isActive, status } = body;
    
    // Accept both formats
    const spec = speciality || specialization;
    const activeStatus = isActive !== undefined ? isActive : (status === 'ACTIVE' ? 1 : status === 'INACTIVE' ? 0 : undefined);

    const check = await db.query<{ id: string }>(
      `SELECT id FROM teachers WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json({ error: 'Enseignant non trouvé' }, { status: 404 });
    }

    // Check for duplicate email if changing
    if (email) {
      const existing = await db.query<{ id: string }>(
        `SELECT id FROM teachers WHERE organizationId = ? AND email = ? AND id != ?`,
        [user.organizationId, email, id]
      );
      if (existing.length > 0) {
        return NextResponse.json({ error: 'Un enseignant avec cet email existe déjà' }, { status: 400 });
      }
    }

    // Build update
    const updates: string[] = [];
    const args: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); args.push(name); }
    if (email !== undefined) { updates.push('email = ?'); args.push(email || null); }
    if (phone !== undefined) { updates.push('phone = ?'); args.push(phone || null); }
    if (spec !== undefined) { updates.push('speciality = ?'); args.push(spec || null); }
    if (activeStatus !== undefined) { updates.push('isActive = ?'); args.push(activeStatus); }

    const now = new Date().toISOString();
    updates.push('updatedAt = ?');
    args.push(now);
    args.push(id);

    await db.execute(`UPDATE teachers SET ${updates.join(', ')} WHERE id = ?`, args);

    const teachers = await db.query<Teacher>(`SELECT * FROM teachers WHERE id = ?`, [id]);
    return NextResponse.json({ teacher: teachers[0] });
  } catch (error) {
    console.error('Update teacher error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

// Delete teacher
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
      return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 });
    }

    await db.execute(`DELETE FROM teachers WHERE id = ? AND organizationId = ?`, [id, user.organizationId]);
    return NextResponse.json({ message: 'Enseignant supprimé avec succès' });
  } catch (error) {
    console.error('Delete teacher error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
