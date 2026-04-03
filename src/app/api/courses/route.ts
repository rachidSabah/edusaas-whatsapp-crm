export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

// Hardcoded fallback credentials for Cloudflare Pages deployment
const FALLBACK_TURSO_URL = 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
const FALLBACK_TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';

interface Course {
  id: string;
  organizationId: string;
  name: string;
  title?: string;
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

    let sql = `SELECT id, organizationId, COALESCE(name, title) as name, title, code, description, duration, fee, isActive, createdAt, updatedAt FROM courses WHERE organizationId = ? AND isActive = 1`;
    const args: any[] = [user.organizationId];

    if (search) {
      sql += ` AND (name LIKE ? OR title LIKE ? OR description LIKE ?)`;
      args.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create course
export async function POST(request: NextRequest) {
  const requestId = `course_${Date.now()}`;
  console.log(`[${requestId}] === CREATE COURSE START ===`);
  
  try {
    // Step 1: Authenticate user
    console.log(`[${requestId}] Step 1: Authenticating user...`);
    let user;
    try {
      user = await requireAuth();
      console.log(`[${requestId}] User authenticated: ${user.email} (${user.role})`);
    } catch (authError) {
      console.error(`[${requestId}] Authentication failed:`, authError);
      return NextResponse.json({ 
        error: 'Non autorisé', 
        details: authError instanceof Error ? authError.message : String(authError)
      }, { status: 401 });
    }
    
    const db = getDbContext();
    console.log(`[${requestId}] Database context obtained`);

    if (!user.organizationId) {
      console.error(`[${requestId}] No organization for user: ${user.id}`);
      return NextResponse.json({ 
        error: 'No organization associated',
        details: 'User does not have an organization assigned'
      }, { status: 400 });
    }
    console.log(`[${requestId}] User organization: ${user.organizationId}`);

    // Step 2: Parse request body
    console.log(`[${requestId}] Step 2: Parsing request body...`);
    let body;
    try {
      body = await request.json();
      console.log(`[${requestId}] Request body:`, JSON.stringify(body).substring(0, 200));
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      return NextResponse.json({ 
        error: 'Invalid request body',
        details: parseError instanceof Error ? parseError.message : String(parseError)
      }, { status: 400 });
    }
    
    const { name, code, description, duration, fee } = body;

    if (!name) {
      console.error(`[${requestId}] Missing required field: name`);
      return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
    }

    // Step 3: Check for duplicate
    console.log(`[${requestId}] Step 3: Checking for duplicate course...`);
    let existing;
    try {
      existing = await db.query<{ id: string }>(
        `SELECT id FROM courses WHERE organizationId = ? AND (name = ? OR title = ?) AND isActive = 1`,
        [user.organizationId, name, name]
      );
      console.log(`[${requestId}] Duplicate check result: ${existing.length} existing courses`);
    } catch (dupCheckError) {
      console.error(`[${requestId}] Duplicate check failed:`, dupCheckError);
      return NextResponse.json({ 
        error: 'Database error during duplicate check',
        details: dupCheckError instanceof Error ? dupCheckError.message : String(dupCheckError)
      }, { status: 500 });
    }

    if (existing.length > 0) {
      console.error(`[${requestId}] Duplicate course found: ${existing[0].id}`);
      return NextResponse.json({ error: 'Un cours avec ce nom existe déjà' }, { status: 400 });
    }

    const id = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[${requestId}] Generated course ID: ${id}`);

    // Step 4: Insert course
    console.log(`[${requestId}] Step 4: Inserting course into database...`);
    try {
      await db.execute(
        `INSERT INTO courses (id, organizationId, title, name, code, description, duration, fee, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [id, user.organizationId, name, name, code || null, description || null, duration || null, fee || 0]
      );
      console.log(`[${requestId}] Course inserted successfully`);
    } catch (insertError) {
      console.error(`[${requestId}] Insert failed:`, insertError);
      return NextResponse.json({ 
        error: 'Failed to create course',
        details: insertError instanceof Error ? insertError.message : String(insertError),
        sql: 'INSERT INTO courses'
      }, { status: 500 });
    }

    // Build the course object from what we just inserted — no replica lag possible
    const course: Course = {
      id,
      organizationId: user.organizationId,
      name,
      code: code || null,
      description: description || null,
      duration: duration || null,
      fee: fee || 0,
      isActive: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log(`[${requestId}] === CREATE COURSE SUCCESS ===`);
    return NextResponse.json({ success: true, course });
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
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
        title = COALESCE(?, title),
        name = COALESCE(?, name),
        code = COALESCE(?, code),
        description = COALESCE(?, description),
        duration = COALESCE(?, duration),
        fee = COALESCE(?, fee),
        isActive = COALESCE(?, isActive),
        updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, name, code, description, duration, fee, isActive, id]
    );

    const courses = await db.query<Course>(`SELECT id, organizationId, COALESCE(name, title) as name, title, code, description, duration, fee, isActive, createdAt, updatedAt FROM courses WHERE id = ?`, [id]);
    return NextResponse.json({ course: courses[0] });
  } catch (error) {
    console.error('Update course error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
