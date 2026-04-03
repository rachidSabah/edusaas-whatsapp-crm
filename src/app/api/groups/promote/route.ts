export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

// Rename group / promote students
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { groupId, action, newName, promoteToYear } = body;

    if (!groupId) {
      return NextResponse.json({ error: 'groupId requis' }, { status: 400 });
    }

    // Verify group belongs to organization
    const groups = await db.query<{ id: string; name: string; currentYear: number }>(
      `SELECT id, name, currentYear FROM groups WHERE id = ? AND organizationId = ?`,
      [groupId, user.organizationId]
    );

    if (groups.length === 0) {
      return NextResponse.json({ error: 'Groupe non trouvé' }, { status: 404 });
    }

    const group = groups[0];

    if (action === 'rename') {
      // Rename group
      if (!newName) {
        return NextResponse.json({ error: 'newName requis pour le renommage' }, { status: 400 });
      }

      await db.execute(
        `UPDATE groups SET name = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [newName, groupId]
      );

      return NextResponse.json({ 
        message: 'Groupe renommé avec succès',
        oldName: group.name,
        newName 
      });
    }

    if (action === 'promote') {
      // Promote all students in group to next year
      const toYear = promoteToYear || (group.currentYear + 1);

      // Get all active students in group
      const students = await db.query<{ id: string; fullName: string; currentYear: number }>(
        `SELECT id, fullName, currentYear FROM students WHERE groupId = ? AND organizationId = ? AND status = 'ACTIVE'`,
        [groupId, user.organizationId]
      );

      const results = [];

      for (const student of students) {
        const fromYear = student.currentYear;
        
        // Update student year
        await db.execute(
          `UPDATE students SET currentYear = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          [toYear, student.id]
        );

        // Log promotion
        const promotionId = `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.execute(
          `INSERT INTO promotion_history (id, organizationId, studentId, fromYear, toYear, promotedById, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [promotionId, user.organizationId, student.id, fromYear, toYear, user.id, `Promotion du groupe ${group.name}`]
        );

        results.push({
          studentId: student.id,
          studentName: student.fullName,
          fromYear,
          toYear,
        });
      }

      // Update group current year
      await db.execute(
        `UPDATE groups SET currentYear = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [toYear, groupId]
      );

      return NextResponse.json({
        message: `${students.length} étudiant(s) promu(s) avec succès`,
        promotedCount: students.length,
        toYear,
        details: results,
      });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (error) {
    console.error('Group promotion error:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'opération' }, { status: 500 });
  }
}
