export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, hashPassword } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: string;
  locale: string | null;
  organizationId: string | null;
  emailVerified: string | null;
  lastLogin: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// Get users
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    // Only SUPER_ADMIN and ORG_ADMIN can view users
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ORG_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    // Build SQL query
    let sql = `SELECT id, email, name, avatar, role, locale, organizationId, emailVerified, lastLogin, isActive, createdAt, updatedAt 
               FROM users WHERE 1=1`;
    const args: any[] = [];

    // Non-super admin can only see users in their organization
    if (user.role !== 'SUPER_ADMIN') {
      sql += ` AND organizationId = ?`;
      args.push(user.organizationId);
    }

    if (role) {
      sql += ` AND role = ?`;
      args.push(role);
    }

    sql += ` ORDER BY createdAt DESC`;

    const users = await db.query<User>(sql, args);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Create user
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    // Only SUPER_ADMIN and ORG_ADMIN can create users
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ORG_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, name, role, organizationId } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if user with this email already exists
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Non-super admin can only create users in their organization
    const targetOrgId = user.role === 'SUPER_ADMIN' ? organizationId : user.organizationId;

    // Non-super admin cannot create super admin
    const targetRole = user.role === 'SUPER_ADMIN' ? role : (role === 'SUPER_ADMIN' ? 'CHAT_OPERATOR' : role);

    const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const hashedPassword = await hashPassword(password);
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO users (id, email, password, name, role, organizationId, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [id, email.toLowerCase(), hashedPassword, name, targetRole || 'CHAT_OPERATOR', targetOrgId || null, now, now]
    );

    // Fetch the created user
    const result = await db.query<User>(
      `SELECT id, email, name, avatar, role, locale, organizationId, isActive, createdAt FROM users WHERE id = ?`,
      [id]
    );

    const newUser = result[0];

    return NextResponse.json({ user: newUser });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Update user
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    const body = await request.json();
    const { id, name, email, role, isActive, password } = body;

    // Users can update their own profile, admins can update others
    const isAdmin = user.role === 'SUPER_ADMIN' || user.role === 'ORG_ADMIN';
    const isSelf = user.id === id;

    if (!isAdmin && !isSelf) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get the target user
    const targetUsers = await db.query<{ id: string; organizationId: string | null; role: string }>(
      `SELECT id, organizationId, role FROM users WHERE id = ?`,
      [id]
    );

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const targetUser = targetUsers[0];

    // Non-super admin can only update users in their organization
    if (user.role !== 'SUPER_ADMIN' && targetUser.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Only super admin can change role to SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot assign SUPER_ADMIN role' },
        { status: 403 }
      );
    }

    // Build update query
    const updates: string[] = [];
    const args: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      args.push(name);
    }

    if (email !== undefined) {
      updates.push('email = ?');
      args.push(email.toLowerCase());
    }

    if (role !== undefined && isAdmin) {
      updates.push('role = ?');
      args.push(role);
    }

    if (isActive !== undefined && isAdmin) {
      updates.push('isActive = ?');
      args.push(isActive ? 1 : 0);
    }

    if (password) {
      const hashedPassword = await hashPassword(password);
      updates.push('password = ?');
      args.push(hashedPassword);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    updates.push('updatedAt = ?');
    args.push(now);
    args.push(id);

    await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, args);

    // Fetch updated user
    const result = await db.query<User>(
      `SELECT id, email, name, avatar, role, locale, organizationId, isActive, createdAt FROM users WHERE id = ?`,
      [id]
    );

    const updatedUser = result[0];

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Delete user
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    // Only SUPER_ADMIN and ORG_ADMIN can delete users
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ORG_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Cannot delete yourself
    if (id === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Get the target user
    const targetUsers = await db.query<{ id: string; organizationId: string | null; role: string }>(
      `SELECT id, organizationId, role FROM users WHERE id = ?`,
      [id]
    );

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const targetUser = targetUsers[0];

    // Non-super admin can only delete users in their organization
    if (user.role !== 'SUPER_ADMIN' && targetUser.organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Non-super admin cannot delete super admin
    if (targetUser.role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete SUPER_ADMIN' },
        { status: 403 }
      );
    }

    await db.execute(`DELETE FROM users WHERE id = ?`, [id]);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
