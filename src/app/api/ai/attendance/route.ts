export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getDbContext } from '@/lib/db-context';

interface Student {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  groupId: string | null;
  groupName: string | null;
  parentId: string | null;
  parentName: string | null;
  parentPhone: string | null;
  status: string;
}

interface AttendanceRequest {
  action: 'search' | 'mark' | 'options';
  organizationId: string;
  studentName?: string;
  studentId?: string;
  status?: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  date?: string;
  notes?: string;
  phone?: string;
}

interface AttendanceRecord {
  id: string;
  organizationId: string;
  studentId: string;
  groupId: string | null;
  date: string;
  session: string | null;
  status: string;
  notes: string | null;
  parentNotified: number;
  createdAt: string;
}

// Search for students by name
async function searchStudents(
  db: ReturnType<typeof getDbContext>,
  organizationId: string,
  searchName: string
): Promise<Student[]> {
  const searchPattern = `%${searchName}%`;
  const students = await db.query<Student>(
    `SELECT s.id, s.organizationId, s.firstName, s.lastName, s.fullName, s.phone, 
            s.groupId, s.status, g.name as groupName, 
            s.parentId, p.fullName as parentName, p.phone as parentPhone
     FROM students s
     LEFT JOIN groups g ON s.groupId = g.id
     LEFT JOIN parents p ON s.parentId = p.id
     WHERE s.organizationId = ? AND s.status = 'ACTIVE'
     AND (s.firstName LIKE ? OR s.lastName LIKE ? OR s.fullName LIKE ?)
     ORDER BY s.fullName
     LIMIT 10`,
    [organizationId, searchPattern, searchPattern, searchPattern]
  );
  return students;
}

// Get student by ID
async function getStudentById(
  db: ReturnType<typeof getDbContext>,
  organizationId: string,
  studentId: string
): Promise<Student | null> {
  const students = await db.query<Student>(
    `SELECT s.id, s.organizationId, s.firstName, s.lastName, s.fullName, s.phone, 
            s.groupId, s.status, g.name as groupName,
            s.parentId, p.fullName as parentName, p.phone as parentPhone
     FROM students s
     LEFT JOIN groups g ON s.groupId = g.id
     LEFT JOIN parents p ON s.parentId = p.id
     WHERE s.id = ? AND s.organizationId = ?`,
    [studentId, organizationId]
  );
  return students[0] || null;
}

// Get student by phone (from WhatsApp)
async function getStudentByPhone(
  db: ReturnType<typeof getDbContext>,
  organizationId: string,
  phone: string
): Promise<Student | null> {
  const normalizedPhone = phone.replace(/[^\d+]/g, '');
  const phonePattern = `%${normalizedPhone.slice(-9)}%`;

  const students = await db.query<Student>(
    `SELECT s.id, s.organizationId, s.firstName, s.lastName, s.fullName, s.phone, 
            s.groupId, s.status, g.name as groupName,
            s.parentId, p.fullName as parentName, p.phone as parentPhone
     FROM students s
     LEFT JOIN groups g ON s.groupId = g.id
     LEFT JOIN parents p ON s.parentId = p.id
     WHERE s.organizationId = ? AND s.status = 'ACTIVE'
     AND (s.phone LIKE ? OR p.phone LIKE ?)
     ORDER BY s.fullName
     LIMIT 1`,
    [organizationId, phonePattern, phonePattern]
  );
  return students[0] || null;
}

// Mark attendance
async function markAttendance(
  db: ReturnType<typeof getDbContext>,
  organizationId: string,
  studentId: string,
  status: string,
  date: string,
  notes?: string
): Promise<{ id: string; status: string; alreadyExists: boolean }> {
  const existing = await db.query<AttendanceRecord>(
    `SELECT id, status FROM attendance WHERE organizationId = ? AND studentId = ? AND date = ?`,
    [organizationId, studentId, date]
  );

  if (existing.length > 0) {
    await db.execute(
      `UPDATE attendance SET status = ?, notes = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [status, notes || null, existing[0].id]
    );
    return { id: existing[0].id, status, alreadyExists: true };
  }

  const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  await db.execute(
    `INSERT INTO attendance (id, organizationId, studentId, date, status, notes, parentNotified)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [id, organizationId, studentId, date, status, notes || null]
  );

  return { id, status, alreadyExists: false };
}

// Generate AI response for attendance interaction (Edge-compatible)
async function generateAttendanceResponse(
  action: string,
  student: Student | null,
  students: Student[] | null,
  status?: string,
  alreadyExists?: boolean
): Promise<string> {
  // Simple response generation without SDK (Edge-compatible)
  if (action === 'search') {
    if (students && students.length === 0) {
      return `Aucun étudiant n'a été trouvé avec ce nom. Veuillez vérifier l'orthographe ou contacter l'administration.`;
    } else if (students && students.length === 1) {
      return `J'ai trouvé l'étudiant "${students[0].fullName}". Quel statut de présence souhaitez-vous enregistrer ?\n\nOptions: PRÉSENT, ABSENT, RETARD, EXCUSÉ`;
    } else if (students && students.length > 1) {
      const namesList = students.map((s, i) => `${i + 1}. ${s.fullName}${s.groupName ? ` (${s.groupName})` : ''}`).join('\n');
      return `Plusieurs étudiants correspondent à cette recherche:\n\n${namesList}\n\nVeuillez préciser en donnant le numéro ou le nom complet.`;
    }
  } else if (action === 'options') {
    return `Options de présence pour "${student?.fullName}":\n\n1. PRÉSENT - L'étudiant est présent\n2. ABSENT - L'étudiant est absent\n3. RETARD - L'étudiant est en retard\n4. EXCUSÉ - L'absence est justifiée\n\nVeuillez choisir une option.`;
  } else if (action === 'mark') {
    const statusLabels: Record<string, string> = {
      PRESENT: 'présent',
      ABSENT: 'absent',
      LATE: 'en retard',
      EXCUSED: 'excusé',
    };
    const statusText = statusLabels[status || 'PRESENT'];
    const existenceText = alreadyExists 
      ? ' (Le statut a été mis à jour, un enregistrement existait déjà pour cette date)'
      : '';
    
    return `✅ La présence de "${student?.fullName}" a été enregistrée comme "${statusText}" pour aujourd'hui.${existenceText}\n\nPuis-je vous aider pour autre chose ?`;
  }

  return 'Je ne peux pas traiter cette demande pour le moment.';
}

// Main handler
export async function POST(request: NextRequest) {
  try {
    const body: AttendanceRequest = await request.json();
    const { action, organizationId, studentName, studentId, status, date, notes, phone } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Identifiant organisation requis', message: 'Veuillez fournir un identifiant d\'organisation.' },
        { status: 400 }
      );
    }

    const db = getDbContext();
    const today = date || new Date().toISOString().split('T')[0];

    switch (action) {
      case 'search': {
        if (studentName) {
          const students = await searchStudents(db, organizationId, studentName);
          const aiResponse = await generateAttendanceResponse('search', null, students);

          return NextResponse.json({
            action: 'search',
            students: students.map(s => ({
              id: s.id,
              fullName: s.fullName,
              groupName: s.groupName,
              parentName: s.parentName,
            })),
            aiResponse,
            requiresSelection: students.length > 1,
          });
        }

        if (phone) {
          const student = await getStudentByPhone(db, organizationId, phone);
          if (student) {
            const aiResponse = await generateAttendanceResponse('options', student, null);
            return NextResponse.json({
              action: 'options',
              student: {
                id: student.id,
                fullName: student.fullName,
                groupName: student.groupName,
              },
              aiResponse,
            });
          }
          return NextResponse.json({
            action: 'search',
            students: [],
            aiResponse: 'Aucun étudiant trouvé avec ce numéro de téléphone. Veuillez contacter l\'administration.',
          });
        }

        return NextResponse.json(
          { error: 'Paramètres insuffisants', message: 'Veuillez fournir un nom ou un numéro de téléphone.' },
          { status: 400 }
        );
      }

      case 'options': {
        if (!studentId) {
          return NextResponse.json(
            { error: 'ID étudiant requis', message: 'Veuillez fournir l\'identifiant de l\'étudiant.' },
            { status: 400 }
          );
        }

        const student = await getStudentById(db, organizationId, studentId);
        if (!student) {
          return NextResponse.json(
            { error: 'Étudiant non trouvé', message: 'L\'étudiant demandé n\'existe pas.' },
            { status: 404 }
          );
        }

        const aiResponse = await generateAttendanceResponse('options', student, null);

        return NextResponse.json({
          action: 'options',
          student: {
            id: student.id,
            fullName: student.fullName,
            groupName: student.groupName,
          },
          options: [
            { value: 'PRESENT', label: 'Présent', description: 'L\'étudiant est présent' },
            { value: 'ABSENT', label: 'Absent', description: 'L\'étudiant est absent' },
            { value: 'LATE', label: 'Retard', description: 'L\'étudiant est en retard' },
            { value: 'EXCUSED', label: 'Excusé', description: 'L\'absence est justifiée' },
          ],
          aiResponse,
        });
      }

      case 'mark': {
        if (!studentId || !status) {
          return NextResponse.json(
            { error: 'Paramètres manquants', message: 'Veuillez fournir l\'identifiant de l\'étudiant et le statut.' },
            { status: 400 }
          );
        }

        const validStatuses = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
        if (!validStatuses.includes(status)) {
          return NextResponse.json(
            { error: 'Statut invalide', message: 'Le statut doit être: PRESENT, ABSENT, LATE, ou EXCUSED.' },
            { status: 400 }
          );
        }

        const student = await getStudentById(db, organizationId, studentId);
        if (!student) {
          return NextResponse.json(
            { error: 'Étudiant non trouvé', message: 'L\'étudiant demandé n\'existe pas.' },
            { status: 404 }
          );
        }

        const result = await markAttendance(db, organizationId, studentId, status, today, notes);
        const aiResponse = await generateAttendanceResponse('mark', student, null, status, result.alreadyExists);

        return NextResponse.json({
          action: 'mark',
          success: true,
          attendance: {
            id: result.id,
            studentId,
            studentName: student.fullName,
            status,
            date: today,
            alreadyExists: result.alreadyExists,
          },
          aiResponse,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Action non reconnue', message: 'Les actions valides sont: search, options, mark.' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('AI Attendance error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', message: 'Une erreur s\'est produite lors du traitement de votre demande.' },
      { status: 500 }
    );
  }
}

// Get attendance for a student
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const studentId = searchParams.get('studentId');
    const date = searchParams.get('date');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Identifiant organisation requis' },
        { status: 400 }
      );
    }

    const db = getDbContext();

    if (studentId && date) {
      const attendance = await db.query<AttendanceRecord>(
        `SELECT * FROM attendance WHERE organizationId = ? AND studentId = ? AND date = ?`,
        [organizationId, studentId, date]
      );
      return NextResponse.json({ attendance });
    }

    if (date) {
      const attendance = await db.query<AttendanceRecord & { studentName: string }>(
        `SELECT a.*, s.fullName as studentName 
         FROM attendance a
         JOIN students s ON a.studentId = s.id
         WHERE a.organizationId = ? AND a.date = ?
         ORDER BY s.fullName`,
        [organizationId, date]
      );
      return NextResponse.json({ attendance });
    }

    if (studentId) {
      const attendance = await db.query<AttendanceRecord>(
        `SELECT * FROM attendance WHERE organizationId = ? AND studentId = ? ORDER BY date DESC LIMIT 30`,
        [organizationId, studentId]
      );
      return NextResponse.json({ attendance });
    }

    return NextResponse.json(
      { error: 'Paramètres insuffisants', message: 'Veuillez fournir studentId ou date.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', message: 'Impossible de récupérer les données de présence.' },
      { status: 500 }
    );
  }
}
