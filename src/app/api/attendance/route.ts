export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

interface AttendanceRecord {
  id: string;
  organizationId: string;
  studentId: string;
  groupId: string | null;
  date: string;
  session: string | null;
  status: string;
  notes: string | null;
  markedById: string | null;
  parentNotified: number;
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  studentFirstName: string | null;
  studentLastName: string | null;
  studentFullName: string | null;
  studentGroupId: string | null;
  groupName: string | null;
  // Legacy parent fields
  parentName: string | null;
  parentPhone: string | null;
  // New parent fields
  parent1Name: string | null;
  parent1Phone: string | null;
  parent1Whatsapp: number;
  parent2Name: string | null;
  parent2Phone: string | null;
  parent2Whatsapp: number;
  markedByName: string | null;
}

interface Template {
  id: string;
  name: string;
  content: string;
  signature: string | null;
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

// Send WhatsApp message via Meta API
async function sendWhatsAppMessage(
  db: ReturnType<typeof getDbContext>,
  organizationId: string,
  to: string,
  message: string,
  templateName?: string,
  templateParams?: any[]
): Promise<{ success: boolean; messageId?: string }> {
  try {
    // Get Meta configuration
    const configs = await db.query<{
      phoneNumberId: string;
      accessToken: string;
    }>(
      `SELECT phoneNumberId, accessToken FROM whatsapp_meta_numbers 
       WHERE organizationId = ? AND isPrimary = 1 LIMIT 1`,
      [organizationId]
    );

    // Fallback to default if no primary found
    let metaConfig = configs[0];
    if (!metaConfig) {
      const allConfigs = await db.query<{
        phoneNumberId: string;
        accessToken: string;
      }>(
        `SELECT phoneNumberId, accessToken FROM whatsapp_meta_numbers 
         WHERE organizationId = ? LIMIT 1`,
        [organizationId]
      );
      metaConfig = allConfigs[0];
    }

    if (!metaConfig) {
      console.error('No Meta WhatsApp configuration found for organization:', organizationId);
      return { success: false };
    }

    const formattedPhone = to.replace(/[^0-9]/g, '');
    
    let payload: any;
    if (templateName) {
      payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'fr' },
          components: templateParams ? [
            {
              type: 'body',
              parameters: templateParams
            }
          ] : []
        }
      };
    } else {
      payload = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: { body: message }
      };
    }

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${metaConfig.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${metaConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Meta API error:', result.error?.message);
      return { success: false };
    }

    const messageId = result.messages?.[0]?.id;

    // Find or create contact
    let contactId: string | null = null;
    const contacts = await db.query<{ id: string }>(
      `SELECT id FROM contacts WHERE organizationId = ? AND phone = ?`,
      [organizationId, to]
    );

    if (contacts.length > 0) {
      contactId = contacts[0].id;
    } else {
      contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.execute(
        `INSERT INTO conversations (id, organizationId, contactId, status) VALUES (?, ?, ?, 'active')`,
        [conversationId, organizationId, contactId]
      );
    }

    // Store outgoing message
    const msgId = messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await db.execute(
      `INSERT INTO messages (id, organizationId, conversationId, content, direction, status) VALUES (?, ?, ?, ?, 'outbound', 'sent')`,
      [msgId, organizationId, conversationId, templateName ? `[Template: ${templateName}] ${message}` : message]
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

// Log WhatsApp notification
async function logNotification(
  db: ReturnType<typeof getDbContext>,
  data: {
    organizationId: string;
    studentId: string;
    attendanceId: string;
    phoneNumber: string;
    parentName: string | null;
    message: string;
    messageType: string;
    sentById: string;
  }
): Promise<string> {
  const id = `wn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    await db.execute(
      `INSERT INTO whatsapp_notifications 
       (id, organizationId, studentId, attendanceId, phoneNumber, parentName, message, messageType, status, sentById, sentAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', ?, CURRENT_TIMESTAMP)`,
      [id, data.organizationId, data.studentId, data.attendanceId, 
       data.phoneNumber, data.parentName, data.message, data.messageType, data.sentById]
    );
  } catch (error) {
    // Table might not exist yet, continue without logging
    console.error('Error logging notification:', error);
  }
  
  return id;
}

// Map attendance status to trigger action
const STATUS_TO_TRIGGER: Record<string, string> = {
  ABSENT: 'ABSENT',
  LATE: 'LATE',
};

// Get attendance records
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({
        attendance: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const groupId = searchParams.get('groupId');
    const studentId = searchParams.get('studentId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let sql = `SELECT a.*, 
               s.firstName as studentFirstName, s.lastName as studentLastName, s.fullName as studentFullName,
               s.groupId as studentGroupId, g.name as groupName,
               p.fullName as parentName, p.phone as parentPhone,
               s.parent1Name, s.parent1Phone, s.parent1Whatsapp,
               s.parent2Name, s.parent2Phone, s.parent2Whatsapp,
               u.name as markedByName
               FROM attendance a
               LEFT JOIN students s ON a.studentId = s.id
               LEFT JOIN groups g ON a.groupId = g.id
               LEFT JOIN parents p ON s.parentId = p.id
               LEFT JOIN users u ON a.markedById = u.id
               WHERE a.organizationId = ?`;
    const args: any[] = [user.organizationId];

    if (date) {
      sql += ` AND a.date = ?`;
      args.push(date);
    }

    if (groupId) {
      sql += ` AND a.groupId = ?`;
      args.push(groupId);
    }

    if (studentId) {
      sql += ` AND a.studentId = ?`;
      args.push(studentId);
    }

    if (status) {
      sql += ` AND a.status = ?`;
      args.push(status);
    }

    sql += ` ORDER BY a.date DESC, a.createdAt DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const rows = await db.query<AttendanceRecord>(sql, args);

    let countSql = `SELECT COUNT(*) as count FROM attendance WHERE organizationId = ?`;
    const countArgs: any[] = [user.organizationId];

    if (date) {
      countSql += ` AND date = ?`;
      countArgs.push(date);
    }

    if (groupId) {
      countSql += ` AND groupId = ?`;
      countArgs.push(groupId);
    }

    if (studentId) {
      countSql += ` AND studentId = ?`;
      countArgs.push(studentId);
    }

    if (status) {
      countSql += ` AND status = ?`;
      countArgs.push(status);
    }

    const countRows = await db.query<{ count: number }>(countSql, countArgs);
    const total = countRows[0]?.count || 0;

    const attendance = rows.map(row => ({
      id: row.id,
      organizationId: row.organizationId,
      studentId: row.studentId,
      groupId: row.groupId,
      date: row.date,
      session: row.session,
      status: row.status,
      notes: row.notes,
      markedById: row.markedById,
      parentNotified: row.parentNotified,
      notifiedAt: row.notifiedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      student: {
        id: row.studentId,
        firstName: row.studentFirstName,
        lastName: row.studentLastName,
        fullName: row.studentFullName,
        groupId: row.studentGroupId,
        group: row.groupId ? { id: row.groupId, name: row.groupName } : null,
        // Legacy parent
        parent: row.parentName ? { fullName: row.parentName, phone: row.parentPhone } : null,
        // New parents with WhatsApp flags
        parent1: row.parent1Name ? {
          name: row.parent1Name,
          phone: row.parent1Phone,
          whatsapp: row.parent1Whatsapp === 1
        } : null,
        parent2: row.parent2Name ? {
          name: row.parent2Name,
          phone: row.parent2Phone,
          whatsapp: row.parent2Whatsapp === 1
        } : null,
      },
      group: row.groupId ? { id: row.groupId, name: row.groupName } : null,
      markedBy: row.markedById ? { id: row.markedById, name: row.markedByName } : null,
    }));

    return NextResponse.json({
      attendance,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// Mark attendance
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
    const { records } = body;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Invalid records format' },
        { status: 400 }
      );
    }

    const results = [];
    const notificationsSent = [];

    // Get organization name for templates
    const orgs = await db.query<{ name: string }>(
      `SELECT name FROM organizations WHERE id = ?`,
      [user.organizationId]
    );
    const orgName = orgs[0]?.name || 'Administration';

    for (const record of records) {
      const { studentId, date, status, notes, groupId, session, notifyParent, sendWhatsApp, notifyParents } = record;
      // notifyParents can be: 'parent1', 'parent2', 'both', or undefined (default: all WhatsApp-enabled parents)

      if (!studentId || !date || !status) continue;

      // Check if record already exists for this student and date
      const existing = await db.query<{ id: string }>(
        `SELECT id FROM attendance WHERE organizationId = ? AND studentId = ? AND date = ?`,
        [user.organizationId, studentId, date]
      );

      let attendanceId: string;

      if (existing.length > 0) {
        attendanceId = existing[0].id;
        await db.execute(
          `UPDATE attendance SET status = ?, notes = ?, groupId = ?, session = ?, markedById = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
          [status, notes || null, groupId || null, session || null, user.id, attendanceId]
        );
      } else {
        attendanceId = `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await db.execute(
          `INSERT INTO attendance (id, organizationId, studentId, groupId, date, session, status, notes, markedById)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [attendanceId, user.organizationId, studentId, groupId || null, date, session || null, status, notes || null, user.id]
        );
      }

      // Handle WhatsApp notification if requested
      const triggerAction = STATUS_TO_TRIGGER[status];
      if (sendWhatsApp && triggerAction) {
        // Get student and parent info
        const students = await db.query<{
          id: string;
          fullName: string;
          parentName: string | null;
          parentPhone: string | null;
          parent1Name: string | null;
          parent1Phone: string | null;
          parent1Whatsapp: number;
          parent2Name: string | null;
          parent2Phone: string | null;
          parent2Whatsapp: number;
          groupName: string | null;
        }>(
          `SELECT s.id, s.fullName, p.fullName as parentName, p.phone as parentPhone,
                  s.parent1Name, s.parent1Phone, s.parent1Whatsapp,
                  s.parent2Name, s.parent2Phone, s.parent2Whatsapp,
                  g.name as groupName
           FROM students s
           LEFT JOIN parents p ON s.parentId = p.id
           LEFT JOIN groups g ON s.groupId = g.id
           WHERE s.id = ? AND s.organizationId = ?`,
          [studentId, user.organizationId]
        );

        if (students.length > 0) {
          const student = students[0];
          
          // Determine which parents to notify based on notifyParents parameter
          const shouldNotifyParent1 = notifyParents === 'parent1' || notifyParents === 'both' || !notifyParents;
          const shouldNotifyParent2 = notifyParents === 'parent2' || notifyParents === 'both' || !notifyParents;
          
          const parentPhones: { phone: string; name: string | null }[] = [];
          
          if (shouldNotifyParent1 && student.parent1Phone && student.parent1Whatsapp === 1) {
            parentPhones.push({ phone: student.parent1Phone, name: student.parent1Name });
          }
          
          if (shouldNotifyParent2 && student.parent2Phone && student.parent2Whatsapp === 1) {
            parentPhones.push({ phone: student.parent2Phone, name: student.parent2Name });
          }
          
          // Fallback to legacy parent if no new parents found
          if (parentPhones.length === 0 && student.parentPhone) {
            parentPhones.push({ phone: student.parentPhone, name: student.parentName });
          }

          // Get template
          const template = await getTemplateForAction(db, user.organizationId, triggerAction);
          
          // Get absence config for Meta template name
          const absenceConfigs = await db.query<{ templateName: string }>(
            `SELECT templateName FROM absence_notification_config WHERE organizationId = ? AND isEnabled = 1`,
            [user.organizationId]
          );
          const metaTemplateName = absenceConfigs[0]?.templateName || (triggerAction === 'ABSENT' ? 'student_absence' : 'student_late');

          const message = template 
            ? processTemplateContent(template.content, template.signature, {
                eleve: student.fullName,
                date: date,
                statut: status === 'ABSENT' ? 'absent(e)' : 'en retard',
                organisation: orgName,
                groupe: student.groupName || '',
              })
            : `Notification: ${student.fullName} est marqué ${status === 'ABSENT' ? 'absent(e)' : 'en retard'} le ${date}.`;

          for (const parentInfo of parentPhones) {
            // Send via Meta API
            const result = await sendWhatsAppMessage(
              db, 
              user.organizationId, 
              parentInfo.phone, 
              message,
              metaTemplateName,
              [{ type: 'text', text: student.fullName }]
            );
            
            if (result.success) {
              // Log the notification
              await logNotification(db, {
                organizationId: user.organizationId,
                studentId: student.id,
                attendanceId,
                phoneNumber: parentInfo.phone,
                parentName: parentInfo.name,
                message,
                messageType: triggerAction,
                sentById: user.id,
              });
              
              notificationsSent.push({
                studentName: student.fullName,
                phone: parentInfo.phone,
                status: status
              });
            }
          }
          
          // Mark as notified if at least one message was sent
          if (notificationsSent.some(n => n.studentName === student.fullName)) {
            await db.execute(
              `UPDATE attendance SET parentNotified = 1, notifiedAt = CURRENT_TIMESTAMP WHERE id = ?`,
              [attendanceId]
            );
          }
        }
      }

      // Fetch the attendance record with student info
      const attRecords = await db.query<{
        id: string;
        studentId: string;
        studentFullName: string | null;
        firstName: string | null;
        lastName: string | null;
        date: string;
        status: string;
        parentNotified: number;
      }>(
        `SELECT a.id, a.studentId, a.parentNotified, s.fullName as studentFullName, s.firstName, s.lastName, a.date, a.status
         FROM attendance a
         LEFT JOIN students s ON a.studentId = s.id
         WHERE a.id = ?`,
        [attendanceId]
      );

      if (attRecords.length > 0) {
        const att = attRecords[0];
        results.push({
          ...att,
          student: {
            id: studentId,
            fullName: att.studentFullName,
            firstName: att.firstName,
            lastName: att.lastName,
            parent: students[0]?.parentName ? { fullName: students[0].parentName, phone: students[0].parentPhone } : null,
            group: students[0]?.groupName ? { name: students[0].groupName } : null,
          },
        });
      }
    }

    return NextResponse.json({
      message: 'Présences enregistrées avec succès',
      count: results.length,
      attendance: results,
      notificationsSent,
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
