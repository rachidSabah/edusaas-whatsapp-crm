export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

interface Template {
  id: string;
  organizationId: string | null;
  name: string;
  category: string;
  subject: string | null;
  content: string;
  variables: string | null;
  isSystem: number;
  triggerAction: string | null;
  signature: string | null;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// Get templates - includes system templates and organization templates
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const triggerAction = searchParams.get('triggerAction');
    const includeSystem = searchParams.get('includeSystem') !== 'false';

    // Build SQL query with parameterized queries for security
    let sql = `SELECT * FROM templates WHERE isActive = 1`;
    const args: any[] = [];
    
    // Add organization filter
    if (user.organizationId) {
      sql += ` AND (isSystem = 1 OR organizationId = ?)`;
      args.push(user.organizationId);
    } else {
      sql += ` AND isSystem = 1`;
    }
    
    if (category) {
      sql += ` AND category = ?`;
      args.push(category);
    }
    
    if (triggerAction) {
      sql += ` AND triggerAction = ?`;
      args.push(triggerAction);
    }

    sql += ` ORDER BY isSystem DESC, createdAt DESC`;

    const templates = await db.query<Template>(sql, args);

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Create template
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, category, subject, content, variables, triggerAction, signature, duplicateFrom } = body;

    // If duplicating from a system template
    if (duplicateFrom) {
      const systemTemplate = await db.query<Template>(
        `SELECT * FROM templates WHERE id = ? AND isSystem = 1`,
        [duplicateFrom]
      );

      if (systemTemplate.length > 0) {
        const tpl = systemTemplate[0];
        const id = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await db.execute(
          `INSERT INTO templates (id, organizationId, name, category, subject, content, variables, isSystem, triggerAction, signature, isActive)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1)`,
          [
            id,
            user.organizationId,
            name || `${tpl.name} (copie)`,
            category || tpl.category,
            subject || tpl.subject,
            content || tpl.content,
            variables || tpl.variables,
            triggerAction || tpl.triggerAction,
            signature || tpl.signature,
          ]
        );

        const result = await db.query<Template>(`SELECT * FROM templates WHERE id = ?`, [id]);
        return NextResponse.json({ template: result[0] });
      }
    }

    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      );
    }

    // Check if template with this name already exists for this organization
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM templates WHERE organizationId = ? AND name = ?`,
      [user.organizationId, name]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Un template avec ce nom existe déjà' },
        { status: 400 }
      );
    }

    const id = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.execute(
      `INSERT INTO templates (id, organizationId, name, category, subject, content, variables, isSystem, triggerAction, signature, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1)`,
      [
        id,
        user.organizationId,
        name,
        category || 'GENERAL',
        subject || null,
        content,
        variables ? JSON.stringify(variables) : null,
        triggerAction || null,
        signature || 'Administration',
      ]
    );

    const result = await db.query<Template>(`SELECT * FROM templates WHERE id = ?`, [id]);
    const template = result[0];

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Update template
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    const body = await request.json();
    const { id, name, category, subject, content, variables, triggerAction, signature, isActive } = body;

    // Check if it's a system template - create a copy instead
    const template = await db.query<Template>(
      `SELECT * FROM templates WHERE id = ?`,
      [id]
    );

    if (template.length === 0) {
      return NextResponse.json(
        { error: 'Template non trouvé' },
        { status: 404 }
      );
    }

    if (template[0].isSystem === 1) {
      // Create a copy for the organization
      if (!user.organizationId) {
        return NextResponse.json(
          { error: 'No organization associated' },
          { status: 400 }
        );
      }

      const newId = `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.execute(
        `INSERT INTO templates (id, organizationId, name, category, subject, content, variables, isSystem, triggerAction, signature, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1)`,
        [
          newId,
          user.organizationId,
          name || `${template[0].name} (personnalisé)`,
          category || template[0].category,
          subject || template[0].subject,
          content || template[0].content,
          variables ? JSON.stringify(variables) : template[0].variables,
          triggerAction || template[0].triggerAction,
          signature || template[0].signature,
        ]
      );

      const result = await db.query<Template>(`SELECT * FROM templates WHERE id = ?`, [newId]);
      return NextResponse.json({ template: result[0], isCopy: true });
    }

    // Verify template belongs to organization
    if (template[0].organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    await db.execute(
      `UPDATE templates SET 
       name = COALESCE(?, name),
       category = COALESCE(?, category),
       subject = COALESCE(?, subject),
       content = COALESCE(?, content),
       variables = COALESCE(?, variables),
       triggerAction = COALESCE(?, triggerAction),
       signature = COALESCE(?, signature),
       isActive = COALESCE(?, isActive),
       updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, category, subject, content, variables ? JSON.stringify(variables) : null, triggerAction, signature, isActive, id]
    );

    const result = await db.query<Template>(`SELECT * FROM templates WHERE id = ?`, [id]);
    const updatedTemplate = result[0];

    return NextResponse.json({ template: updatedTemplate });
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Delete template (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Check if it's a system template
    const template = await db.query<Template>(
      `SELECT * FROM templates WHERE id = ?`,
      [id]
    );

    if (template.length === 0) {
      return NextResponse.json(
        { error: 'Template non trouvé' },
        { status: 404 }
      );
    }

    if (template[0].isSystem === 1) {
      return NextResponse.json(
        { error: 'Les templates système ne peuvent pas être supprimés' },
        { status: 403 }
      );
    }

    // Verify template belongs to organization
    if (template[0].organizationId !== user.organizationId) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 403 }
      );
    }

    // Soft delete
    await db.execute(
      `UPDATE templates SET isActive = 0, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ message: 'Template supprimé avec succès' });
  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
