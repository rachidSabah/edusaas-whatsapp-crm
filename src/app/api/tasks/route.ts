export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface Task {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  assignedToId: string | null;
  assignedToType: string | null;
  createdBy: string;
  dueDate: string;
  startDate: string;
  status: string;
  priority: string;
  progress: number;
  attachments: string | null;
  completedAt: string | null;
  createdAt: string;
  // Joined fields
  assignedToName?: string | null;
  createdByName?: string | null;
}

// GET tasks - List all tasks or filter by status/assignee
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ tasks: [] });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedToMe = searchParams.get('me') === 'true';
    const assignedByMe = searchParams.get('created') === 'true';
    const priority = searchParams.get('priority');
    const overdue = searchParams.get('overdue') === 'true';

    let sql = `SELECT t.*, 
               u.name as assignedToName, 
               c.name as createdByName
               FROM tasks t
               LEFT JOIN users u ON t.assignedToId = u.id
               LEFT JOIN users c ON t.createdBy = c.id
               WHERE t.organizationId = ?`;
    const args: any[] = [user.organizationId];

    // Filter by assignment
    if (assignedToMe) {
      sql += ` AND t.assignedToId = ?`;
      args.push(user.id);
    }

    if (assignedByMe) {
      sql += ` AND t.createdBy = ?`;
      args.push(user.id);
    }

    // Filter by status
    if (status && status !== 'all') {
      sql += ` AND t.status = ?`;
      args.push(status);
    }

    // Filter by priority
    if (priority && priority !== 'all') {
      sql += ` AND t.priority = ?`;
      args.push(priority);
    }

    // Filter overdue tasks
    if (overdue) {
      sql += ` AND t.status NOT IN ('COMPLETED') AND t.dueDate < date('now')`;
    }

    sql += ` ORDER BY 
             CASE t.priority 
               WHEN 'URGENT' THEN 1 
               WHEN 'HIGH' THEN 2 
               WHEN 'MEDIUM' THEN 3 
               ELSE 4 
             END,
             t.dueDate ASC`;

    const tasks = await db.query<Task>(sql, args);

    // Auto-update overdue status for pending tasks
    const now = new Date().toISOString().split('T')[0];
    for (const task of tasks) {
      if (task.status === 'PENDING' && task.dueDate < now) {
        await db.execute(
          `UPDATE tasks SET status = 'OVERDUE', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          [task.id]
        );
        task.status = 'OVERDUE';
      }
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// CREATE task - Create a new assignment
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'Aucune organisation associée' }, { status: 400 });
    }

    const body = await request.json() as {
      title: string;
      description?: string;
      assignedToId?: string;
      assignedToType?: string;
      dueDate: string;
      startDate?: string;
      priority?: string;
      attachments?: string[];
    };
    const { 
      title, 
      description, 
      assignedToId, 
      assignedToType, 
      dueDate, 
      startDate, 
      priority, 
      attachments 
    } = body;

    if (!title || !dueDate) {
      return NextResponse.json({ 
        error: 'Le titre et la date d\'échéance sont requis' 
      }, { status: 400 });
    }

    const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    await db.execute(
      `INSERT INTO tasks 
       (id, organizationId, title, description, assignedToId, assignedToType, createdBy, 
        createdAt, dueDate, startDate, status, priority, progress, attachments, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, 0, ?, ?)`,
      [
        id,
        user.organizationId,
        title,
        description || null,
        assignedToId || null,
        assignedToType || 'USER',
        user.id,
        now,
        dueDate,
        startDate || now.split('T')[0],
        priority || 'MEDIUM',
        attachments ? JSON.stringify(attachments) : null,
        now
      ]
    );

    // Get the created task with user names
    const result = await db.query<Task>(
      `SELECT t.*, u.name as assignedToName, c.name as createdByName 
       FROM tasks t 
       LEFT JOIN users u ON t.assignedToId = u.id 
       LEFT JOIN users c ON t.createdBy = c.id 
       WHERE t.id = ?`,
      [id]
    );

    return NextResponse.json({ 
      task: result[0],
      message: 'Tâche créée avec succès'
    });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// UPDATE task - Update status, progress, or details
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    const body = await request.json() as {
      id: string;
      title?: string;
      description?: string;
      status?: string;
      progress?: number;
      priority?: string;
      dueDate?: string;
      assignedToId?: string;
      attachments?: string[];
    };
    const { 
      id, 
      title, 
      description, 
      status, 
      progress, 
      priority, 
      dueDate, 
      assignedToId,
      attachments 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID de tâche requis' }, { status: 400 });
    }

    // Verify task belongs to organization
    const existing = await db.query<Task>(
      `SELECT * FROM tasks WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Tâche non trouvée' }, { status: 404 });
    }

    // Validate status
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    // Build dynamic update
    const updates: string[] = ['updatedAt = CURRENT_TIMESTAMP'];
    const args: any[] = [];

    if (title !== undefined) { updates.push('title = ?'); args.push(title); }
    if (description !== undefined) { updates.push('description = ?'); args.push(description); }
    if (status !== undefined) { 
      updates.push('status = ?'); 
      args.push(status); 
    }
    if (progress !== undefined) { 
      updates.push('progress = ?'); 
      args.push(Math.min(100, Math.max(0, progress))); 
    }
    if (priority !== undefined) { updates.push('priority = ?'); args.push(priority); }
    if (dueDate !== undefined) { updates.push('dueDate = ?'); args.push(dueDate); }
    if (assignedToId !== undefined) { updates.push('assignedToId = ?'); args.push(assignedToId); }
    if (attachments !== undefined) { 
      updates.push('attachments = ?'); 
      args.push(attachments ? JSON.stringify(attachments) : null); 
    }

    // Handle completion
    if (status === 'COMPLETED') {
      updates.push('completedAt = CURRENT_TIMESTAMP');
      updates.push('progress = 100');
    }

    args.push(id);

    await db.execute(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
      args
    );

    const result = await db.query<Task>(
      `SELECT t.*, u.name as assignedToName, c.name as createdByName 
       FROM tasks t 
       LEFT JOIN users u ON t.assignedToId = u.id 
       LEFT JOIN users c ON t.createdBy = c.id 
       WHERE t.id = ?`,
      [id]
    );

    return NextResponse.json({ 
      task: result[0],
      message: 'Tâche mise à jour avec succès'
    });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE task
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de tâche requis' }, { status: 400 });
    }

    // Verify task belongs to organization
    const existing = await db.query<Task>(
      `SELECT * FROM tasks WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Tâche non trouvée' }, { status: 404 });
    }

    await db.execute(
      `DELETE FROM tasks WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ 
      success: true,
      message: 'Tâche supprimée avec succès'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
