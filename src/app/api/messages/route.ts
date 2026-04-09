export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

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

interface Template {
  id: string;
  name: string;
  content: string;
  signature: string | null;
}

// Process template variables
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

// Send WhatsApp message
async function sendWhatsAppMessage(
  db: ReturnType<typeof getDbContext>,
  organizationId: string,
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    // Find or create contact
    let contactId: string | null = null;
    const contacts = await db.query<{ id: string }>(
      `SELECT id FROM contacts WHERE organizationId = ? AND phone = ?`,
      [organizationId, to]
    );

    if (contacts.length > 0) {
      contactId = contacts[0].id;
    } else {
      contactId = `contact_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await db.execute(
        `INSERT INTO contacts (id, organizationId, phone, tags) VALUES (?, ?, ?, 'PARENT')`,
        [contactId, organizationId, to]
      );
    }

    // Find or create conversation
    let conversationId: string;
    const conversations = await db.query<{ id: string }>(
      `SELECT id FROM conversations WHERE organizationId = ? AND contactId = ? AND status IN ('active', 'pending') ORDER BY lastMessageAt DESC LIMIT 1`,
      [organizationId, contactId]
    );

    if (conversations.length > 0) {
      conversationId = conversations[0].id;
    } else {
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await db.execute(
        `INSERT INTO conversations (id, organizationId, contactId, status) VALUES (?, ?, ?, 'active')`,
        [conversationId, organizationId, contactId]
      );
    }

    // Store outgoing message
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await db.execute(
      `INSERT INTO messages (id, organizationId, conversationId, content, direction, status) VALUES (?, ?, ?, ?, 'outbound', 'sent')`,
      [msgId, organizationId, conversationId, message]
    );

    // Update conversation
    await db.execute(
      `UPDATE conversations SET lastMessageAt = CURRENT_TIMESTAMP, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [conversationId]
    );

    return { success: true, messageId: msgId };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false };
  }
}

// Get students with parent WhatsApp info for messaging
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ students: [] });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const studentId = searchParams.get('studentId');

    let sql = `SELECT s.id, s.fullName, s.firstName, s.lastName, 
               s.parent1Name, s.parent1Phone, s.parent1Whatsapp,
               s.parent2Name, s.parent2Phone, s.parent2Whatsapp,
               g.name as groupName
               FROM students s
               LEFT JOIN groups g ON s.groupId = g.id
               WHERE s.organizationId = ? AND s.status = 'ACTIVE'`;
    const args: any[] = [user.organizationId];

    if (groupId) {
      sql += ` AND s.groupId = ?`;
      args.push(groupId);
    }

    if (studentId) {
      sql += ` AND s.id = ?`;
      args.push(studentId);
    }

    sql += ` ORDER BY s.fullName`;

    const students = await db.query<Student>(sql, args);

    // Format response with parent info
    const formattedStudents = students.map(s => ({
      id: s.id,
      fullName: s.fullName,
      firstName: s.firstName,
      lastName: s.lastName,
      groupName: s.groupName,
      parent1: s.parent1Name ? {
        name: s.parent1Name,
        phone: s.parent1Phone,
        whatsapp: s.parent1Whatsapp === 1
      } : null,
      parent2: s.parent2Name ? {
        name: s.parent2Name,
        phone: s.parent2Phone,
        whatsapp: s.parent2Whatsapp === 1
      } : null,
    }));

    return NextResponse.json({ students: formattedStudents });
  } catch (error) {
    console.error('Get students for messaging error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Send administrative message (payment delay, general announcement, etc.)
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
      message, 
      messageType,
      templateId,
      variables 
    } = body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Student IDs are required' },
        { status: 400 }
      );
    }

    if (!message && !templateId) {
      return NextResponse.json(
        { error: 'Message or template ID is required' },
        { status: 400 }
      );
    }

    // Get organization info
    const orgResult = await db.query<{ name: string }>(
      `SELECT name FROM organizations WHERE id = ?`,
      [user.organizationId]
    );
    const orgName = orgResult[0]?.name || 'Administration';

    // Get template if specified
    let template: Template | null = null;
    if (templateId) {
      const templates = await db.query<Template>(
        `SELECT id, name, content, signature FROM templates WHERE id = ? AND organizationId = ? AND isActive = 1`,
        [templateId, user.organizationId]
      );
      template = templates.length > 0 ? templates[0] : null;
    }

    const results: { studentName: string; parentName: string; phone: string; success: boolean }[] = [];
    let totalSent = 0;
    let totalAttempted = 0;

    for (const studentId of studentIds) {
      // Get student with parent info
      const students = await db.query<Student>(
        `SELECT s.id, s.fullName, s.firstName, s.lastName, 
                s.parent1Name, s.parent1Phone, s.parent1Whatsapp,
                s.parent2Name, s.parent2Phone, s.parent2Whatsapp,
                g.name as groupName
         FROM students s
         LEFT JOIN groups g ON s.groupId = g.id
         WHERE s.id = ? AND s.organizationId = ?`,
        [studentId, user.organizationId]
      );

      if (students.length === 0) continue;

      const student = students[0];

      // Collect all parent phones with WhatsApp enabled
      const parentPhones: { phone: string; name: string }[] = [];
      
      if (student.parent1Phone && student.parent1Whatsapp === 1) {
        parentPhones.push({ phone: student.parent1Phone, name: student.parent1Name || 'Parent 1' });
      }
      
      if (student.parent2Phone && student.parent2Whatsapp === 1) {
        parentPhones.push({ phone: student.parent2Phone, name: student.parent2Name || 'Parent 2' });
      }

      if (parentPhones.length === 0) continue;

      // Process message content
      let finalMessage = message;
      
      if (template) {
        const templateVariables: Record<string, string> = {
          StudentName: student.fullName,
          FirstName: student.firstName,
          LastName: student.lastName,
          GroupName: student.groupName || 'Non assigné',
          ParentName: student.parent1Name || '',
          organisation: orgName,
          Date: new Date().toLocaleDateString('fr-FR', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          }),
          Time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          ...variables,
        };
        
        finalMessage = processTemplateContent(template.content, template.signature, templateVariables);
      }

      // Send to all selected parents
      for (const parentInfo of parentPhones) {
        totalAttempted++;
        const result = await sendWhatsAppMessage(db, user.organizationId, parentInfo.phone, finalMessage);
        
        if (result.success) {
          totalSent++;
        }
        
        results.push({
          studentName: student.fullName,
          parentName: parentInfo.name,
          phone: parentInfo.phone,
          success: result.success,
        });
      }
    }

    return NextResponse.json({
      message: `${totalSent} message(s) envoyé(s) avec succès`,
      totalSent,
      totalAttempted,
      results,
    });
  } catch (error) {
    console.error('Send administrative message error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
