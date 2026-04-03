export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface AcademicYear {
  id: string;
  organizationId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// Calculate duration in months between two dates
function calculateDurationMonths(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(1, months);
}

// Get academic years
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ academicYears: [] });
    }

    const academicYears = await db.query<AcademicYear>(
      `SELECT * FROM academic_years WHERE organizationId = ? AND isActive = 1 ORDER BY startDate DESC`,
      [user.organizationId]
    );

    // Add calculated durationMonths to each result
    const enrichedYears = academicYears.map(year => ({
      ...year,
      durationMonths: calculateDurationMonths(year.startDate, year.endDate)
    }));

    return NextResponse.json({ academicYears: enrichedYears });
  } catch (error) {
    console.error('Get academic years error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

// Create academic year
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body = await request.json();
    const { name, startDate, endDate } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Le nom, date de début et date de fin sont requis' }, { status: 400 });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return NextResponse.json({ error: 'La date de fin doit être postérieure à la date de début' }, { status: 400 });
    }

    // Check for overlapping academic years
    const overlapping = await db.query<{ id: string }>(
      `SELECT id FROM academic_years 
       WHERE organizationId = ? AND isActive = 1 
       AND ((startDate <= ? AND endDate >= ?) OR (startDate <= ? AND endDate >= ?))`,
      [user.organizationId, startDate, startDate, endDate, endDate]
    );

    if (overlapping.length > 0) {
      return NextResponse.json({ error: 'Cette période chevauche une année académique existante' }, { status: 400 });
    }

    const id = `ay_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    await db.execute(
      `INSERT INTO academic_years (id, organizationId, name, startDate, endDate, isActive)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [id, user.organizationId, name, startDate, endDate]
    );

    const academicYears = await db.query<AcademicYear>(`SELECT * FROM academic_years WHERE id = ?`, [id]);
    const newYear = academicYears[0];
    
    return NextResponse.json({ 
      academicYear: {
        ...newYear,
        durationMonths: calculateDurationMonths(newYear.startDate, newYear.endDate)
      }
    });
  } catch (error) {
    console.error('Create academic year error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

// Update academic year
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body = await request.json();
    const { id, name, startDate, endDate, isActive } = body;

    const check = await db.query<{ id: string }>(
      `SELECT id FROM academic_years WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json({ error: 'Année académique non trouvée' }, { status: 404 });
    }

    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        return NextResponse.json({ error: 'La date de fin doit être postérieure à la date de début' }, { status: 400 });
      }
    }

    await db.execute(
      `UPDATE academic_years SET 
        name = COALESCE(?, name),
        startDate = COALESCE(?, startDate),
        endDate = COALESCE(?, endDate),
        isActive = COALESCE(?, isActive),
        updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, startDate, endDate, isActive, id]
    );

    const academicYears = await db.query<AcademicYear>(`SELECT * FROM academic_years WHERE id = ?`, [id]);
    const updatedYear = academicYears[0];
    
    return NextResponse.json({ 
      academicYear: {
        ...updatedYear,
        durationMonths: calculateDurationMonths(updatedYear.startDate, updatedYear.endDate)
      }
    });
  } catch (error) {
    console.error('Update academic year error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}

// Delete academic year
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
      return NextResponse.json({ error: 'Academic year ID is required' }, { status: 400 });
    }

    // Verify ownership
    const check = await db.query<{ id: string }>(
      `SELECT id FROM academic_years WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json({ error: 'Année académique non trouvée' }, { status: 404 });
    }

    await db.execute(`UPDATE academic_years SET isActive = 0 WHERE id = ?`, [id]);
    return NextResponse.json({ message: 'Année académique supprimée avec succès' });
  } catch (error) {
    console.error('Delete academic year error:', error);
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
