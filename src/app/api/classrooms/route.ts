export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

interface Classroom {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  capacity: number;
  building: string | null;
  floor: string | null;
  facilities: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// Get classrooms
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ 
        classrooms: [],
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
      console.warn(`[Classrooms API] Organization ${user.organizationId} not found for user ${user.id}`);
      return NextResponse.json({ 
        classrooms: [],
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

    let sql = `SELECT * FROM classrooms WHERE organizationId = ? AND isActive = 1`;
    const args: any[] = [user.organizationId];

    if (search) {
      sql += ` AND (name LIKE ? OR building LIKE ? OR code LIKE ?)`;
      const searchPattern = `%${search}%`;
      args.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY name ASC`;

    const classrooms = await db.query<Classroom>(sql, args);
    return NextResponse.json({ classrooms }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Get classrooms error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

// Create classroom
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body = await request.json();
    const { name, code, capacity, building, floor, facilities } = body;

    if (!name) {
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    // Check for duplicate name
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM classrooms WHERE organizationId = ? AND name = ? AND isActive = 1`,
      [user.organizationId, name]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Une salle avec ce nom existe déjà' }, { status: 400 });
    }

    const id = `classroom_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Use executeWithVerify for reliable persistence
    const createResult = await db.executeWithVerify<Classroom>(
      `INSERT INTO classrooms (id, organizationId, name, code, capacity, building, floor, facilities, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, user.organizationId, name, code || null, capacity || 30, building || null, floor || null, facilities || null],
      `SELECT * FROM classrooms WHERE id = ?`,
      [id]
    );

    // If verification failed, try one more fetch
    let classroom = createResult.data?.[0];
    if (!classroom) {
      console.warn('[Create classroom] Verification failed, retrying fetch...');
      await new Promise(resolve => setTimeout(resolve, 300));
      const retryResult = await db.query<Classroom>(`SELECT * FROM classrooms WHERE id = ?`, [id]);
      classroom = retryResult[0];
    }

    return NextResponse.json({ classroom });
  } catch (error) {
    console.error('Create classroom error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

// Update classroom
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body = await request.json();
    const { id, name, code, capacity, building, floor, facilities, isActive } = body;

    const check = await db.query<{ id: string }>(
      `SELECT id FROM classrooms WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json({ error: 'Salle non trouvée' }, { status: 404 });
    }

    await db.execute(
      `UPDATE classrooms SET 
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        capacity = COALESCE(?, capacity),
        building = COALESCE(?, building),
        floor = COALESCE(?, floor),
        facilities = COALESCE(?, facilities),
        isActive = COALESCE(?, isActive),
        updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, code, capacity, building, floor, facilities, isActive, id]
    );

    const classrooms = await db.query<Classroom>(`SELECT * FROM classrooms WHERE id = ?`, [id]);
    return NextResponse.json({ classroom: classrooms[0] });
  } catch (error) {
    console.error('Update classroom error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

// Delete classroom
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
      return NextResponse.json({ error: 'Classroom ID is required' }, { status: 400 });
    }

    // Verify ownership
    const check = await db.query<{ id: string }>(
      `SELECT id FROM classrooms WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json({ error: 'Salle non trouvée' }, { status: 404 });
    }

    await db.execute(`UPDATE classrooms SET isActive = 0 WHERE id = ?`, [id]);
    return NextResponse.json({ message: 'Salle supprimée avec succès' });
  } catch (error) {
    console.error('Delete classroom error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
