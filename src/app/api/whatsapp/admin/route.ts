export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

interface Template {
  id: string;
  name: string;
  content: string;
  signature: string | null;
}

interface Student {
  id: string;
  fullName: string;
  firstName: string;
  lastName: string;
  groupName: string | null;
  parent1Name: string | null;
  parent1Phone: string | null;
  parent1Whatsapp: number;
  parent2Name: string | null;
  parent2Phone: string | null;
  parent2Whatsapp: number;
}

// Replace template variables with actual values
function processTemplateContent(
  content: string,
  signature: string | null,
  variables: Record<string, string>
): string {
  let processed = content;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    processed = processed.replace(regex, value);
  }
  
  if (signature) {
    const processedSignature = signature.replace(
      /\{organisation\}/g, 
      variables.organisation || 'Administration'
    );
    processed += `\n${processedSignature}`;
  }
  
  return processed;
}

// Get template for trigger action
async function getTemplateForAction(
  db: ReturnType<typeof getDbContext>,
  organizationId: string,
  triggerAction: string
): Promise<Template | null> {
  // Check for organization-specific template first
  const orgTemplates = await db.query<Template>(
    `SELECT id, name, content, signature FROM templates 
     WHERE organizationId = ? AND triggerAction = ? AND isActive = 1 LIMIT 1`,
    [organizationId, triggerAction]
  );
  
  if (orgTemplates.length > 0) {
    return orgTemplates[0];
  }
  
  // Fall back to system template
  const systemTemplates = await db.query<Template>(
    `SELECT id, name, content, signature FROM templates 
     WHERE isSystem = 1 AND triggerAction = ? AND isActive = 1 LIMIT 1`,
    [triggerAction]
  );
  
  return systemTemplates.length > 0 ? systemTemplates[0] : null;
}

// Log WhatsApp notification
async function logNotification(
  db: ReturnType<typeof getDbContext>,
  data: {
    organizationId: string;
    studentId?: string;
    attendanceId?: string;
    phoneNumber: string;
    parentName: string | null;
    message: string;
    messageType: string;
    sentById: string;
  }
): Promise<string> {
  const id = `wn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await db.execute(
    `INSERT INTO whatsapp_notifications 
     (id, organizationId, studentId, attendanceId, phoneNumber, parentName, message, messageType, status, sentById, sentAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, CURRENT_TIMESTAMP)`,
    [id, data.organizationId, data.studentId || null, data.attendanceId || null, 
     data.phoneNumber, data.parentName, data.message, data.messageType, data.sentById]
  );
  
  return id;
}

// Get WhatsApp notification history
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ notifications: [] });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const messageType = searchParams.get('messageType');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let sql = `
      SELECT wn.*, s.fullName as studentName, u.name as sentByName
      FROM whatsapp_notifications wn
      LEFT JOIN students s ON wn.studentId = s.id
      LEFT JOIN users u ON wn.sentById = u.id
      WHERE wn.organizationId = ?
    `;
    const args: any[] = [user.organizationId];

    if (studentId) {
      sql += ` AND wn.studentId = ?`;
      args.push(studentId);
    }

    if (messageType) {
      sql += ` AND wn.messageType = ?`;
      args.push(messageType);
    }

    sql += ` ORDER BY wn.createdAt DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const notifications = await db.query(sql, args);

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Get WhatsApp notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Send administrative WhatsApp message
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
    const { 
      studentIds,
      messageType,
      customMessage,
      templateId,
      variables,
      notifyParents // 'parent1', 'parent2', or 'both'
    } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Student IDs are required' },
        { status: 400 }
      );
    }

    if (!messageType) {
      return NextResponse.json(
        { error: 'Message type is required' },
        { status: 400 }
      );
    }

    // Get organization info
    const orgResult = await db.query<{ name: string }>(
      `SELECT name FROM organizations WHERE id = ?`,
      [user.organizationId]
    );
    const orgName = orgResult[0]?.name || 'Administration';

    // Get students with parent info
    const placeholders = studentIds.map(() => '?').join(',');
    const students = await db.query<Student>(
      `SELECT s.id, s.fullName, s.firstName, s.lastName, g.name as groupName,
              s.parent1Name, s.parent1Phone, s.parent1Whatsapp,
              s.parent2Name, s.parent2Phone, s.parent2Whatsapp
       FROM students s
       LEFT JOIN groups g ON s.groupId = g.id
       WHERE s.id IN (${placeholders}) AND s.organizationId = ?`,
      [...studentIds, user.organizationId]
    );

    // Get template
    let template: Template | null = null;
    const triggerAction = messageType; // ABSENCE, LATE, PAYMENT_DELAY, ADMIN_COMMUNICATION
    
    if (templateId) {
      const templates = await db.query<Template>(
        `SELECT id, name, content, signature FROM templates WHERE id = ? AND isActive = 1`,
        [templateId]
      );
      template = templates.length > 0 ? templates[0] : null;
    } else if (triggerAction) {
      template = await getTemplateForAction(db, user.organizationId, triggerAction);
    }

    if (!template && !customMessage) {
      return NextResponse.json(
        { error: 'Template or custom message is required' },
        { status: 400 }
      );
    }

    const results: {
      studentId: string;
      studentName: string;
      parentName: string;
      phone: string;
      success: boolean;
      notificationId?: string;
    }[] = [];

    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    for (const student of students) {
      // Collect parent phones to notify based on selection
      const parentsToNotify: { phone: string; name: string }[] = [];
      
      if (notifyParents === 'parent1' || notifyParents === 'both' || !notifyParents) {
        if (student.parent1Phone && student.parent1Whatsapp === 1) {
          parentsToNotify.push({ 
            phone: student.parent1Phone, 
            name: student.parent1Name || 'Parent 1' 
          });
        }
      }
      
      if (notifyParents === 'parent2' || notifyParents === 'both') {
        if (student.parent2Phone && student.parent2Whatsapp === 1) {
          parentsToNotify.push({ 
            phone: student.parent2Phone, 
            name: student.parent2Name || 'Parent 2' 
          });
        }
      }

      // If no WhatsApp-enabled parents, try any phone
      if (parentsToNotify.length === 0) {
        if (student.parent1Phone) {
          parentsToNotify.push({ phone: student.parent1Phone, name: student.parent1Name || 'Parent' });
        }
        if (student.parent2Phone && !parentsToNotify.find(p => p.phone === student.parent2Phone)) {
          parentsToNotify.push({ phone: student.parent2Phone || '', name: student.parent2Name || 'Parent' });
        }
      }

      for (const parentInfo of parentsToNotify) {
        try {
          // Build variables
          const messageVariables = {
            StudentName: student.fullName,
            FirstName: student.firstName,
            LastName: student.lastName,
            GroupName: student.groupName || 'Non assigné',
            Date: dateStr,
            Time: timeStr,
            ParentName: parentInfo.name,
            organisation: orgName,
            ...variables,
          };

          // Generate message
          let message = customMessage;
          if (!message && template) {
            message = processTemplateContent(template.content, template.signature, messageVariables);
          }

          if (!message) continue;

          // Store outgoing message in messages table
          // First find or create contact
          let contactId: string | null = null;
          const contacts = await db.query<{ id: string }>(
            `SELECT id FROM contacts WHERE organizationId = ? AND phone = ?`,
            [user.organizationId, parentInfo.phone]
          );

          if (contacts.length > 0) {
            contactId = contacts[0].id;
          } else {
            contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.execute(
              `INSERT INTO contacts (id, organizationId, phone, name, tags) VALUES (?, ?, ?, ?, 'PARENT')`,
              [contactId, user.organizationId, parentInfo.phone, parentInfo.name]
            );
          }

          // Find or create conversation
          let conversationId: string;
          const conversations = await db.query<{ id: string }>(
            `SELECT id FROM conversations WHERE organizationId = ? AND contactId = ? AND status IN ('active', 'pending') ORDER BY lastMessageAt DESC LIMIT 1`,
            [user.organizationId, contactId]
          );

          if (conversations.length > 0) {
            conversationId = conversations[0].id;
          } else {
            conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.execute(
              `INSERT INTO conversations (id, organizationId, contactId, status) VALUES (?, ?, ?, 'active')`,
              [conversationId, user.organizationId, contactId]
            );
          }

          // Store message
          const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await db.execute(
            `INSERT INTO messages (id, organizationId, conversationId, content, direction, status) VALUES (?, ?, ?, ?, 'outbound', 'sent')`,
            [msgId, user.organizationId, conversationId, message]
          );

          // Update conversation
          await db.execute(
            `UPDATE conversations SET lastMessageAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
            [conversationId]
          );

          // Log notification
          const notificationId = await logNotification(db, {
            organizationId: user.organizationId,
            studentId: student.id,
            phoneNumber: parentInfo.phone,
            parentName: parentInfo.name,
            message,
            messageType,
            sentById: user.id,
          });

          results.push({
            studentId: student.id,
            studentName: student.fullName,
            parentName: parentInfo.name,
            phone: parentInfo.phone,
            success: true,
            notificationId,
          });
        } catch (error) {
          results.push({
            studentId: student.id,
            studentName: student.fullName,
            parentName: parentInfo.name,
            phone: parentInfo.phone,
            success: false,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  } catch (error) {
    console.error('Send administrative WhatsApp error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
