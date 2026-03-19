export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

interface Course {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  description: string | null;
  duration: string | null;
  fee: number | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// Get courses
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ 
        courses: [],
        message: 'Aucune organisation associée.'
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }
    
    // Verify organization exists
    const orgCheck = await db.query<{ id: string }>(
      `SELECT id FROM organizations WHERE id = ?`,
      [user.organizationId]
    );
    
    if (orgCheck.length === 0) {
      console.warn(`[Courses API] Organization ${user.organizationId} not found for user ${user.id}`);
      return NextResponse.json({ 
        courses: [],
        message: 'Organisation non trouvée.'
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let sql = `SELECT * FROM courses WHERE organizationId = ? AND isActive = 1`;
    const args: any[] = [user.organizationId];

    if (search) {
      sql += ` AND (name LIKE ? OR description LIKE ?)`;
      args.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY createdAt DESC`;

    const courses = await db.query<Course>(sql, args);
    return NextResponse.json({ courses }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Get courses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create course
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body = await request.json();
    const { name, code, description, duration, fee } = body;

    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    // Check for duplicate
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM courses WHERE organizationId = ? AND name = ? AND isActive = 1`,
      [user.organizationId, name]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Un cours avec ce nom existe déjà' }, { status: 400 });
    }

    const id = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Use executeWithVerify for reliable persistence
    const createResult = await db.executeWithVerify<Course>(
      `INSERT INTO courses (id, organizationId, name, code, description, duration, fee, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, user.organizationId, name, code || null, description || null, duration || null, fee || 0],
      `SELECT * FROM courses WHERE id = ?`,
      [id]
    );

    // If verification failed, try one more fetch
    let course = createResult.data?.[0];
    if (!course) {
      console.warn('[Create course] Verification failed, retrying fetch...');
      await new Promise(resolve => setTimeout(resolve, 300));
      const retryResult = await db.query<Course>(`SELECT * FROM courses WHERE id = ?`, [id]);
      course = retryResult[0];
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error('Create course error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update course
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body = await request.json();
    const { id, name, code, description, duration, fee, isActive } = body;

    const check = await db.query<{ id: string }>(
      `SELECT id FROM courses WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json({ error: 'Cours non trouvé' }, { status: 404 });
    }

    await db.execute(
      `UPDATE courses SET 
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        description = COALESCE(?, description),
        duration = COALESCE(?, duration),
        fee = COALESCE(?, fee),
        isActive = COALESCE(?, isActive),
        updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, code, description, duration, fee, isActive, id]
    );

    const courses = await db.query<Course>(`SELECT * FROM courses WHERE id = ?`, [id]);
    return NextResponse.json({ course: courses[0] });
  } catch (error) {
    console.error('Update course error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete course
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
      return NextResponse.json({ error: 'Course ID is required' }, { status: 400 });
    }

    await db.execute(`UPDATE courses SET isActive = 0 WHERE id = ?`, [id]);
    return NextResponse.json({ message: 'Cours supprimé avec succès' });
  } catch (error) {
    console.error('Delete course error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
