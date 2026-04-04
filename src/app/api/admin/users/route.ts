export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';
import { hashPassword } from '@/lib/auth-hybrid';
import { USER_ROLES } from '@/lib/constants';

interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: number;
  createdAt: string;
  lastLogin: string | null;
}

// GET users
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    // SUPER_ADMIN can see all users, others need organizationId
    if (user.role === USER_ROLES.SUPER_ADMIN) {
      const users = await db.query<User>(
        `SELECT id, organizationId, name, email, phone, role, isActive, createdAt, lastLogin 
         FROM users 
         ORDER BY createdAt DESC`,
        []
      );
      return NextResponse.json({ users });
    }

    if (!user.organizationId) {
      return NextResponse.json({ users: [] });
    }

    // Check if user is admin
    const adminRoles = [USER_ROLES.SUPER_ADMIN, USER_ROLES.ORG_ADMIN, USER_ROLES.SCHOOL_MANAGER];
    if (!adminRoles.includes(user.role as any)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const users = await db.query<User>(
      `SELECT id, organizationId, name, email, phone, role, isActive, createdAt, lastLogin 
       FROM users 
       WHERE organizationId = ? 
       ORDER BY createdAt DESC`,
      [user.organizationId]
    );

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// CREATE user
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    const body = await request.json() as {
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      password?: string;
      organizationId?: string;
    };
    const { name, email, phone, role, password, organizationId } = body;

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Name, email and role required' }, { status: 400 });
    }

    // Check if email exists
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Determine organization
    const targetOrgId = user.role === USER_ROLES.SUPER_ADMIN 
      ? (organizationId || user.organizationId) 
      : user.organizationId;

    if (!targetOrgId) {
      return NextResponse.json({ error: 'No organization specified' }, { status: 400 });
    }

    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const hashedPassword = await hashPassword(password || 'ChangeMe123!');
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO users (id, organizationId, name, email, phone, role, password, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, targetOrgId, name, email.toLowerCase(), phone || null, role, hashedPassword, 1, now, now]
    );

    const result = await db.query<User>(
      `SELECT id, organizationId, name, email, phone, role, isActive, createdAt FROM users WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ user: result[0] });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// UPDATE user
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    const body = await request.json() as {
      id?: string;
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      isActive?: number;
      password?: string;
    };
    const { id, name, email, phone, role, isActive, password } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Build update
    const updates: string[] = [];
    const args: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); args.push(name); }
    if (email !== undefined) { updates.push('email = ?'); args.push(email.toLowerCase()); }
    if (phone !== undefined) { updates.push('phone = ?'); args.push(phone || null); }
    if (role !== undefined) { updates.push('role = ?'); args.push(role); }
    if (isActive !== undefined) { updates.push('isActive = ?'); args.push(isActive ? 1 : 0); }
    
    if (password) {
      const hashedPassword = await hashPassword(password);
      updates.push('password = ?');
      args.push(hashedPassword);
    }

    const now = new Date().toISOString();
    updates.push('updatedAt = ?');
    args.push(now);
    args.push(id);

    await db.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      args
    );

    const result = await db.query<User>(
      `SELECT id, organizationId, name, email, phone, role, isActive, createdAt FROM users WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ user: result[0] });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE user
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Cannot delete self
    if (id === user.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    await db.execute(`DELETE FROM users WHERE id = ?`, [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
