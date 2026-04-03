export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

// Promotion types
type PromotionAction = 
  | 'PROMOTE_YEAR1_TO_YEAR2'  // Promote from Year 1 to Year 2
  | 'MARK_PASSED'             // Mark as passed/graduated
  | 'MARK_FAILED'             // Mark as failed (repeat year)
  | 'MARK_TERMINATED'         // Mark as terminated/withdrawn
  | 'MARK_GRADUATED';         // Mark as graduated

interface PromotionRequest {
  action: PromotionAction;
  studentIds: string[];
  academicYear?: string;
  notes?: string;
}

interface PromotionResult {
  studentId: string;
  studentName: string;
  previousYear: number;
  newYear: number;
  previousStatus: string;
  newStatus: string;
  success: boolean;
  error?: string;
}

// Get promotion history
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ history: [] });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const academicYear = searchParams.get('academicYear');

    let sql = `
      SELECT ph.*, s.fullName as studentName, u.name as promotedByName
      FROM promotion_history ph
      LEFT JOIN students s ON ph.studentId = s.id
      LEFT JOIN users u ON ph.promotedById = u.id
      WHERE ph.organizationId = ?
    `;
    const args: any[] = [user.organizationId];

    if (studentId) {
      sql += ` AND ph.studentId = ?`;
      args.push(studentId);
    }

    if (academicYear) {
      sql += ` AND ph.academicYear = ?`;
      args.push(academicYear);
    }

    sql += ` ORDER BY ph.createdAt DESC LIMIT 100`;

    const history = await db.query<{
      id: string;
      studentId: string;
      studentName: string;
      fromYear: number;
      toYear: number;
      fromStatus: string;
      toStatus: string;
      academicYear: string;
      notes: string;
      promotedByName: string;
      createdAt: string;
    }>(sql, args);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Get promotion history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Process promotion/graduation actions
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization associated' }, { status: 400 });
    }

    const body: PromotionRequest = await request.json();
    const { action, studentIds, academicYear, notes } = body;

    if (!action || !studentIds || studentIds.length === 0) {
      return NextResponse.json({ 
        error: 'Action and student IDs are required' 
      }, { status: 400 });
    }

    // Get current student data
    const placeholders = studentIds.map(() => '?').join(',');
    const students = await db.query<{
      id: string;
      fullName: string;
      currentYear: number;
      status: string;
    }>(
      `SELECT id, fullName, currentYear, status FROM students 
       WHERE id IN (${placeholders}) AND organizationId = ?`,
      [...studentIds, user.organizationId]
    );

    if (students.length === 0) {
      return NextResponse.json({ error: 'No students found' }, { status: 404 });
    }

    const results: PromotionResult[] = [];

    for (const student of students) {
      try {
        let newYear = student.currentYear;
        let newStatus = student.status;
        let fromYear = student.currentYear;
        let fromStatus = student.status;

        switch (action) {
          case 'PROMOTE_YEAR1_TO_YEAR2':
            if (student.currentYear !== 1) {
              results.push({
                studentId: student.id,
                studentName: student.fullName,
                previousYear: student.currentYear,
                newYear: student.currentYear,
                previousStatus: student.status,
                newStatus: student.status,
                success: false,
                error: 'L\'étudiant n\'est pas en 1ère année'
              });
              continue;
            }
            newYear = 2;
            break;

          case 'MARK_PASSED':
            // Move to next year and keep active
            if (student.currentYear === 1) {
              newYear = 2;
            } else {
              // If already in year 2, mark as graduated
              newStatus = 'GRADUATED';
            }
            break;

          case 'MARK_FAILED':
            // Stay in same year but mark status
            // Optionally add a note about failure
            break;

          case 'MARK_TERMINATED':
            newStatus = 'WITHDRAWN';
            break;

          case 'MARK_GRADUATED':
            newStatus = 'GRADUATED';
            break;

          default:
            results.push({
              studentId: student.id,
              studentName: student.fullName,
              previousYear: student.currentYear,
              newYear: student.currentYear,
              previousStatus: student.status,
              newStatus: student.status,
              success: false,
              error: 'Action non reconnue'
            });
            continue;
        }

        // Update student
        await db.execute(
          `UPDATE students SET 
            currentYear = ?, 
            status = ?, 
            updatedAt = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [newYear, newStatus, student.id]
        );

        // Record promotion history
        const historyId = `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.execute(
          `INSERT INTO promotion_history 
           (id, organizationId, studentId, fromYear, toYear, fromStatus, toStatus, promotedById, academicYear, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [historyId, user.organizationId, student.id, fromYear, newYear, fromStatus, newStatus, 
           user.id, academicYear || null, notes || null]
        );

        results.push({
          studentId: student.id,
          studentName: student.fullName,
          previousYear: fromYear,
          newYear,
          previousStatus: fromStatus,
          newStatus,
          success: true
        });
      } catch (err) {
        results.push({
          studentId: student.id,
          studentName: student.fullName,
          previousYear: student.currentYear,
          newYear: student.currentYear,
          previousStatus: student.status,
          newStatus: student.status,
          success: false,
          error: String(err)
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `${successCount} étudiant(s) traité(s) avec succès${failCount > 0 ? `, ${failCount} échoué(s)` : ''}`,
      results,
      summary: {
        total: studentIds.length,
        successful: successCount,
        failed: failCount
      }
    });
  } catch (error) {
    console.error('Promotion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
