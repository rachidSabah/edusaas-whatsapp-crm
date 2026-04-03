export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';
import { canAddStudent as checkStudentLimit } from '@/lib/tenant-edge';

interface Student {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  studentId: string;
  program: string | null;
  groupId: string | null;
  parentId: string | null;
  enrollmentDate: string;
  status: string;
  currentYear: number;
  notes: string | null;
  // Administration fields
  disciplineNotes: string | null;
  incidentNotes: string | null;
  performanceNotes: string | null;
  absences: string | null;
  retards: string | null;
  avertissements: number;
  miseAPied: number;
  // Parent 1 Information
  parent1Name: string | null;
  parent1Phone: string | null;
  parent1Whatsapp: number;
  // Parent 2 Information
  parent2Name: string | null;
  parent2Phone: string | null;
  parent2Whatsapp: number;
  createdAt: string;
  updatedAt: string;
  groupName: string | null;
  parentName: string | null;
  parentPhone: string | null;
}

// Helper function to safely parse JSON
function safeJsonParse(str: string | null, defaultValue: any = []) {
  if (!str) return defaultValue;
  try {
    return JSON.parse(str);
  } catch {
    console.warn('Failed to parse JSON:', str);
    return defaultValue;
  }
}

// Get students for organization
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      // Return empty array with helpful message for users without organization
      return NextResponse.json({
        students: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
        message: 'Aucune organisation associée. Veuillez contacter l\'administrateur pour rejoindre une organisation.',
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
      console.warn(`[Students API] Organization ${user.organizationId} not found for user ${user.id}`);
      return NextResponse.json({
        students: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
        message: 'Organisation non trouvée. Veuillez contacter l\'administrateur.',
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    // If ID is provided, fetch single student
    if (id) {
      const result = await db.query<Student>(
        `SELECT s.*, g.name as groupName, p.fullName as parentName, p.phone as parentPhone 
         FROM students s 
         LEFT JOIN groups g ON s.groupId = g.id 
         LEFT JOIN parents p ON s.parentId = p.id 
         WHERE s.id = ? AND s.organizationId = ?`,
        [id, user.organizationId]
      );

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Étudiant non trouvé', message: 'L\'étudiant demandé n\'existe pas ou vous n\'avez pas les droits d\'accès.' },
          { status: 404 }
        );
      }

      const row = result[0];
      const student = {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        fullName: row.fullName,
        email: row.email,
        phone: row.phone,
        dateOfBirth: row.dateOfBirth,
        gender: row.gender,
        address: row.address,
        studentId: row.studentId,
        program: row.program,
        groupId: row.groupId,
        parentId: row.parentId,
        enrollmentDate: row.enrollmentDate,
        status: row.status,
        currentYear: row.currentYear || 1,
        notes: row.notes,
        disciplineNotes: row.disciplineNotes,
        incidentNotes: row.incidentNotes,
        performanceNotes: row.performanceNotes,
        absences: safeJsonParse(row.absences, []),
        retards: safeJsonParse(row.retards, []),
        avertissements: row.avertissements || 0,
        miseAPied: row.miseAPied || 0,
        parent1Name: row.parent1Name || null,
        parent1Phone: row.parent1Phone || null,
        parent1Whatsapp: row.parent1Whatsapp || 0,
        parent2Name: row.parent2Name || null,
        parent2Phone: row.parent2Phone || null,
        parent2Whatsapp: row.parent2Whatsapp || 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        group: row.groupId ? { id: row.groupId, name: row.groupName } : null,
        parent: row.parentId ? { id: row.parentId, fullName: row.parentName, phone: row.parentPhone } : null,
      };

      return NextResponse.json({ student });
    }

    const status = searchParams.get('status');
    const groupId = searchParams.get('groupId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build SQL query dynamically
    let sql = `SELECT s.*, g.name as groupName, p.fullName as parentName, p.phone as parentPhone 
               FROM students s 
               LEFT JOIN groups g ON s.groupId = g.id 
               LEFT JOIN parents p ON s.parentId = p.id 
               WHERE s.organizationId = ?`;
    const args: any[] = [user.organizationId];

    if (status) {
      sql += ` AND s.status = ?`;
      args.push(status);
    }

    if (groupId) {
      sql += ` AND s.groupId = ?`;
      args.push(groupId);
    }

    if (search) {
      sql += ` AND (s.firstName LIKE ? OR s.lastName LIKE ? OR s.fullName LIKE ? OR s.email LIKE ?)`;
      const searchPattern = `%${search}%`;
      args.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    sql += ` ORDER BY s.createdAt DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const rows = await db.query<Student>(sql, args);

    // Get total count
    let countSql = `SELECT COUNT(*) as count FROM students WHERE organizationId = ?`;
    const countArgs: any[] = [user.organizationId];

    if (status) {
      countSql += ` AND status = ?`;
      countArgs.push(status);
    }

    if (groupId) {
      countSql += ` AND groupId = ?`;
      countArgs.push(groupId);
    }

    if (search) {
      countSql += ` AND (firstName LIKE ? OR lastName LIKE ? OR fullName LIKE ? OR email LIKE ?)`;
      const searchPattern = `%${search}%`;
      countArgs.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const countRows = await db.query<{ count: number }>(countSql, countArgs);
    const total = countRows[0]?.count || 0;

    // Format students
    const students = rows.map(row => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      dateOfBirth: row.dateOfBirth,
      gender: row.gender,
      address: row.address,
      studentId: row.studentId,
      program: row.program,
      groupId: row.groupId,
      parentId: row.parentId,
      enrollmentDate: row.enrollmentDate,
      status: row.status,
      currentYear: row.currentYear || 1,
      notes: row.notes,
      disciplineNotes: row.disciplineNotes,
      incidentNotes: row.incidentNotes,
      performanceNotes: row.performanceNotes,
      absences: safeJsonParse(row.absences, []),
      retards: safeJsonParse(row.retards, []),
      avertissements: row.avertissements || 0,
      miseAPied: row.miseAPied || 0,
      // Parent 1 Information
      parent1Name: row.parent1Name || null,
      parent1Phone: row.parent1Phone || null,
      parent1Whatsapp: row.parent1Whatsapp || 0,
      // Parent 2 Information
      parent2Name: row.parent2Name || null,
      parent2Phone: row.parent2Phone || null,
      parent2Whatsapp: row.parent2Whatsapp || 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      group: row.groupId ? { id: row.groupId, name: row.groupName } : null,
      parent: row.parentId ? { id: row.parentId, fullName: row.parentName, phone: row.parentPhone } : null,
    }));

    return NextResponse.json({
      students,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Get students error:', error);
    // Check if it's an authentication error
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error', message: 'Une erreur inattendue s\'est produite. Veuillez réessayer.', details: String(error) },
      { status: 500 }
    );
  }
}

// Create student
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'Aucune organisation associée', message: 'Veuillez contacter l\'administrateur pour rejoindre une organisation.' },
        { status: 400 }
      );
    }

    // Check if can add student
    const canAdd = await checkStudentLimit(user.organizationId);
    if (!canAdd.allowed) {
      return NextResponse.json(
        { error: 'Limite d\'étudiants atteinte', message: `Vous avez atteint la limite de ${canAdd.limit} étudiants pour votre plan.`, limit: canAdd.limit },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
      program,
      groupId,
      parentId,
      enrollmentDate,
      notes,
      studentId: customStudentId,
      currentYear,
      disciplineNotes,
      incidentNotes,
      performanceNotes,
      // Parent 1 Information
      parent1Name,
      parent1Phone,
      parent1Whatsapp,
      // Parent 2 Information
      parent2Name,
      parent2Phone,
      parent2Whatsapp,
    } = body;

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'Champs requis', message: 'Le prénom et le nom sont obligatoires.' },
        { status: 400 }
      );
    }

    const id = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const studentIdVal = customStudentId || `STD${Date.now()}`;

    // Simple INSERT — if it throws, we catch below. If it succeeds, the data is in the DB.
    await db.execute(
      `INSERT INTO students (id, organizationId, firstName, lastName, fullName, email, phone, dateOfBirth, gender, address, 
       studentId, program, groupId, parentId, enrollmentDate, status, currentYear, notes, disciplineNotes, incidentNotes, 
       performanceNotes, absences, retards, avertissements, miseAPied, 
       parent1Name, parent1Phone, parent1Whatsapp, parent2Name, parent2Phone, parent2Whatsapp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, '[]', '[]', 0, 0, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user.organizationId,
        firstName,
        lastName,
        `${firstName} ${lastName}`,
        email || null,
        phone || null,
        dateOfBirth || null,
        gender || null,
        address || null,
        studentIdVal,
        program || null,
        groupId || null,
        parentId || null,
        enrollmentDate || new Date().toISOString(),
        currentYear || 1,
        notes || null,
        disciplineNotes || null,
        incidentNotes || null,
        performanceNotes || null,
        parent1Name || null,
        parent1Phone || null,
        parent1Whatsapp ? 1 : 0,
        parent2Name || null,
        parent2Phone || null,
        parent2Whatsapp ? 1 : 0,
      ]
    );

    // Build the student object from what we just inserted — no replica lag possible
    const student = {
      id,
      organizationId: user.organizationId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email: email || null,
      phone: phone || null,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      address: address || null,
      studentId: studentIdVal,
      program: program || null,
      groupId: groupId || null,
      parentId: parentId || null,
      enrollmentDate: enrollmentDate || new Date().toISOString(),
      status: 'ACTIVE',
      currentYear: currentYear || 1,
      notes: notes || null,
      disciplineNotes: disciplineNotes || null,
      incidentNotes: incidentNotes || null,
      performanceNotes: performanceNotes || null,
      absences: [],
      retards: [],
      avertissements: 0,
      miseAPied: 0,
      parent1Name: parent1Name || null,
      parent1Phone: parent1Phone || null,
      parent1Whatsapp: parent1Whatsapp ? 1 : 0,
      parent2Name: parent2Name || null,
      parent2Phone: parent2Phone || null,
      parent2Whatsapp: parent2Whatsapp ? 1 : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      group: groupId ? { id: groupId, name: null } : null,
      parent: parentId ? { id: parentId, fullName: null, phone: null } : null,
    };

    return NextResponse.json({ student });
  } catch (error) {
    console.error('Create student error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erreur interne du serveur', message: 'Une erreur inattendue s\'est produite lors de la création de l\'étudiant.', details: String(error) },
      { status: 500 }
    );
  }
}

// Update student
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'Aucune organisation associée', message: 'Veuillez contacter l\'administrateur pour rejoindre une organisation.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      id, 
      firstName, 
      lastName, 
      email, 
      phone, 
      status, 
      groupId, 
      program, 
      currentYear,
      notes,
      disciplineNotes,
      incidentNotes,
      performanceNotes,
      absences,
      retards,
      avertissements,
      miseAPied,
      // Parent 1 Information
      parent1Name,
      parent1Phone,
      parent1Whatsapp,
      // Parent 2 Information
      parent2Name,
      parent2Phone,
      parent2Whatsapp,
    } = body;

    // Verify student belongs to organization
    const check = await db.query<{ id: string }>(
      `SELECT id FROM students WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json(
        { error: 'Étudiant non trouvé', message: 'L\'étudiant demandé n\'existe pas ou vous n\'avez pas les droits d\'accès.' },
        { status: 404 }
      );
    }

    const fullName = firstName && lastName ? `${firstName} ${lastName}` : null;

    // Handle JSON fields
    const absencesJson = absences !== undefined ? JSON.stringify(absences) : undefined;
    const retardsJson = retards !== undefined ? JSON.stringify(retards) : undefined;

    await db.execute(
      `UPDATE students SET 
            firstName = COALESCE(?, firstName),
            lastName = COALESCE(?, lastName),
            fullName = COALESCE(?, fullName),
            email = COALESCE(?, email),
            phone = COALESCE(?, phone),
            status = COALESCE(?, status),
            groupId = COALESCE(?, groupId),
            program = COALESCE(?, program),
            currentYear = COALESCE(?, currentYear),
            notes = COALESCE(?, notes),
            disciplineNotes = COALESCE(?, disciplineNotes),
            incidentNotes = COALESCE(?, incidentNotes),
            performanceNotes = COALESCE(?, performanceNotes),
            absences = COALESCE(?, absences),
            retards = COALESCE(?, retards),
            avertissements = COALESCE(?, avertissements),
            miseAPied = COALESCE(?, miseAPied),
            parent1Name = COALESCE(?, parent1Name),
            parent1Phone = COALESCE(?, parent1Phone),
            parent1Whatsapp = COALESCE(?, parent1Whatsapp),
            parent2Name = COALESCE(?, parent2Name),
            parent2Phone = COALESCE(?, parent2Phone),
            parent2Whatsapp = COALESCE(?, parent2Whatsapp),
            updatedAt = CURRENT_TIMESTAMP
            WHERE id = ?`,
      [firstName, lastName, fullName, email, phone, status, groupId, program, currentYear, 
       notes, disciplineNotes, incidentNotes, performanceNotes, 
       absencesJson, retardsJson, avertissements, miseAPied, 
       parent1Name, parent1Phone, parent1Whatsapp ? 1 : 0,
       parent2Name, parent2Phone, parent2Whatsapp ? 1 : 0,
       id]
    );

    // Fetch updated student
    const result = await db.query<Student>(
      `SELECT s.*, g.name as groupName, p.fullName as parentName, p.phone as parentPhone 
       FROM students s 
       LEFT JOIN groups g ON s.groupId = g.id 
       LEFT JOIN parents p ON s.parentId = p.id 
       WHERE s.id = ?`,
      [id]
    );

    const row = result[0];
    const student = row ? {
      ...row,
      currentYear: row.currentYear || 1,
      absences: safeJsonParse(row.absences, []),
      retards: safeJsonParse(row.retards, []),
      avertissements: row.avertissements || 0,
      miseAPied: row.miseAPied || 0,
      parent1Name: row.parent1Name || null,
      parent1Phone: row.parent1Phone || null,
      parent1Whatsapp: row.parent1Whatsapp || 0,
      parent2Name: row.parent2Name || null,
      parent2Phone: row.parent2Phone || null,
      parent2Whatsapp: row.parent2Whatsapp || 0,
      group: row.groupId ? { id: row.groupId, name: row.groupName } : null,
      parent: row.parentId ? { id: row.parentId, fullName: row.parentName, phone: row.parentPhone } : null,
    } : null;

    return NextResponse.json({ student });
  } catch (error) {
    console.error('Update student error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erreur interne du serveur', message: 'Une erreur inattendue s\'est produite lors de la mise à jour de l\'étudiant.', details: String(error) },
      { status: 500 }
    );
  }
}

// Delete student
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'Aucune organisation associée', message: 'Veuillez contacter l\'administrateur pour rejoindre une organisation.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID requis', message: 'L\'identifiant de l\'étudiant est obligatoire.' },
        { status: 400 }
      );
    }

    // Verify student belongs to organization
    const check = await db.query<{ id: string }>(
      `SELECT id FROM students WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (check.length === 0) {
      return NextResponse.json(
        { error: 'Étudiant non trouvé', message: 'L\'étudiant demandé n\'existe pas ou vous n\'avez pas les droits d\'accès.' },
        { status: 404 }
      );
    }

    await db.execute(`DELETE FROM students WHERE id = ?`, [id]);

    return NextResponse.json({ message: 'Étudiant supprimé avec succès' });
  } catch (error) {
    console.error('Delete student error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Erreur interne du serveur', message: 'Une erreur inattendue s\'est produite lors de la suppression de l\'étudiant.', details: String(error) },
      { status: 500 }
    );
  }
}
