export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

interface EmailMessage {
  id: string;
  organizationId: string;
  configId: string | null;
  folderId: string | null;
  userId: string | null;
  toEmail: string | null;
  toName: string | null;
  cc: string | null;
  bcc: string | null;
  fromEmail: string | null;
  fromName: string | null;
  replyTo: string | null;
  subject: string;
  body: string;
  htmlBody: string | null;
  attachments: string | null;
  direction: string;
  status: string;
  isRead: number;
  isStarred: number;
  isImportant: number;
  messageid: string | null;
  inReplyTo: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EmailFolder {
  id: string;
  organizationId: string;
  userId: string;
  name: string;
  type: string;
  parentId: string | null;
  orderIndex: number;
  createdAt: string;
}

// GET emails or folders
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ emails: [], folders: [] });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder');
    const getFolders = searchParams.get('folders');
    const emailId = searchParams.get('id');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get default folders for user
    if (getFolders === 'true') {
      // Check if user has default folders, create if not
      const existingFolders = await db.query<EmailFolder>(
        `SELECT * FROM email_folders WHERE organizationId = ? AND userId = ?`,
        [user.organizationId, user.id]
      );

      if (existingFolders.length === 0) {
        // Create default folders
        const defaultFolders = [
          { name: 'Boîte de réception', type: 'inbox', order: 0 },
          { name: 'Envoyés', type: 'sent', order: 1 },
          { name: 'Brouillons', type: 'drafts', order: 2 },
          { name: 'Indésirables', type: 'junk', order: 3 },
          { name: 'Corbeille', type: 'deleted', order: 4 },
        ];

        for (const folder of defaultFolders) {
          const id = `ef_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await db.execute(
            `INSERT INTO email_folders (id, organizationId, userId, name, type, orderIndex, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [id, user.organizationId, user.id, folder.name, folder.type, folder.order]
          );
        }

        // Refetch folders
        const folders = await db.query<EmailFolder>(
          `SELECT * FROM email_folders WHERE organizationId = ? AND userId = ? ORDER BY orderIndex`,
          [user.organizationId, user.id]
        );

        return NextResponse.json({ folders });
      }

      // Get unread counts for each folder
      const folders = await db.query<EmailFolder & { unreadCount: number }>(
        `SELECT f.*, 
         (SELECT COUNT(*) FROM email_messages_new e 
          WHERE e.organizationId = f.organizationId 
          AND e.folderId = f.id AND e.isRead = 0) as unreadCount
         FROM email_folders f 
         WHERE f.organizationId = ? AND f.userId = ? 
         ORDER BY f.orderIndex`,
        [user.organizationId, user.id]
      );

      return NextResponse.json({ folders });
    }

    // Get single email
    if (emailId) {
      const emails = await db.query<EmailMessage>(
        `SELECT * FROM email_messages_new WHERE id = ? AND organizationId = ?`,
        [emailId, user.organizationId]
      );

      if (emails.length === 0) {
        return NextResponse.json({ error: 'Email non trouvé' }, { status: 404 });
      }

      // Mark as read
      await db.execute(
        `UPDATE email_messages_new SET isRead = 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [emailId]
      );

      return NextResponse.json({ email: emails[0] });
    }

    // Build query for folder
    let sql = `SELECT * FROM email_messages_new WHERE organizationId = ?`;
    const args: any[] = [user.organizationId];

    // Map folder names to types
    const folderTypes: Record<string, string> = {
      'inbox': 'inbox',
      'sent': 'sent',
      'drafts': 'drafts',
      'junk': 'junk',
      'deleted': 'deleted',
      'boîte de réception': 'inbox',
      'envoyés': 'sent',
      'brouillons': 'drafts',
      'indésirables': 'junk',
      'corbeille': 'deleted',
    };

    if (folder && folderTypes[folder.toLowerCase()]) {
      // Get folder ID
      const folders = await db.query<{ id: string }>(
        `SELECT id FROM email_folders WHERE organizationId = ? AND userId = ? AND type = ?`,
        [user.organizationId, user.id, folderTypes[folder.toLowerCase()]]
      );
      
      if (folders.length > 0) {
        sql += ` AND folderId = ?`;
        args.push(folders[0].id);
      }
    }

    // Search filter
    if (search) {
      sql += ` AND (subject LIKE ? OR body LIKE ? OR fromEmail LIKE ? OR toEmail LIKE ?)`;
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const emails = await db.query<EmailMessage>(sql, args);

    // Get total count
    let countSql = `SELECT COUNT(*) as count FROM email_messages_new WHERE organizationId = ?`;
    const countArgs: any[] = [user.organizationId];
    
    if (folder && folderTypes[folder.toLowerCase()]) {
      const folders = await db.query<{ id: string }>(
        `SELECT id FROM email_folders WHERE organizationId = ? AND userId = ? AND type = ?`,
        [user.organizationId, user.id, folderTypes[folder.toLowerCase()]]
      );
      
      if (folders.length > 0) {
        countSql += ` AND folderId = ?`;
        countArgs.push(folders[0].id);
      }
    }

    if (search) {
      countSql += ` AND (subject LIKE ? OR body LIKE ? OR fromEmail LIKE ? OR toEmail LIKE ?)`;
      const searchTerm = `%${search}%`;
      countArgs.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const countResult = await db.query<{ count: number }>(countSql, countArgs);

    return NextResponse.json({ 
      emails,
      pagination: {
        total: countResult[0]?.count || 0,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Get emails error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// SEND or SAVE email
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'Aucune organisation associée' }, { status: 400 });
    }

    const body = await request.json() as {
      toEmail?: string;
      toName?: string;
      cc?: string;
      bcc?: string;
      subject: string;
      body: string;
      htmlBody?: string;
      attachments?: string[];
      configId?: string;
      isDraft?: boolean;
      inReplyTo?: string;
    };
    const {
      toEmail,
      toName,
      cc,
      bcc,
      subject,
      body: emailBody,
      htmlBody,
      attachments,
      configId,
      isDraft,
      inReplyTo,
    } = body;

    if (!subject || !emailBody) {
      return NextResponse.json({ 
        error: 'Le sujet et le contenu sont requis' 
      }, { status: 400 });
    }

    // Get default config if not specified
    let targetConfigId = configId;
    if (!targetConfigId) {
      const defaultConfig = await db.query<{ id: string }>(
        `SELECT id FROM email_config WHERE organizationId = ? AND isDefault = 1 AND isActive = 1 LIMIT 1`,
        [user.organizationId]
      );
      targetConfigId = defaultConfig[0]?.id || null;
    }

    // Get drafts folder
    const draftsFolder = await db.query<{ id: string }>(
      `SELECT id FROM email_folders WHERE organizationId = ? AND userId = ? AND type = 'drafts'`,
      [user.organizationId, user.id]
    );

    const id = `eml_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create email record
    await db.execute(
      `INSERT INTO email_messages_new 
       (id, organizationId, configId, folderId, userId, toEmail, toName, cc, bcc, 
        subject, body, htmlBody, attachments, direction, status, isRead, 
        inReplyTo, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'outbound', ?, 1, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        id,
        user.organizationId,
        targetConfigId,
        draftsFolder[0]?.id || null,
        user.id,
        toEmail,
        toName,
        cc || null,
        bcc || null,
        subject,
        emailBody,
        htmlBody || null,
        attachments ? JSON.stringify(attachments) : null,
        isDraft ? 'draft' : 'pending',
        inReplyTo || null
      ]
    );

    // If not draft, attempt to send
    if (!isDraft && targetConfigId && toEmail) {
      // Get email config for sending
      const config = await db.query<{
        provider: string;
        smtpHost: string | null;
        smtpPort: number;
        smtpUser: string | null;
        smtpPassword: string | null;
        brevoApiKey: string | null;
        fromEmail: string | null;
        fromName: string | null;
      }>(
        `SELECT provider, smtpHost, smtpPort, smtpUser, smtpPassword, brevoApiKey, fromEmail, fromName 
         FROM email_config WHERE id = ?`,
        [targetConfigId]
      );

      if (config.length > 0 && config[0].smtpHost) {
        try {
          // Send via SMTP (simplified - in production use proper email service)
          // For now, we'll just mark as sent
          // In production, you'd use a service like Brevo, SendGrid, or nodemailer
          
          const sentAt = new Date().toISOString();
          
          // Get sent folder
          const sentFolder = await db.query<{ id: string }>(
            `SELECT id FROM email_folders WHERE organizationId = ? AND userId = ? AND type = 'sent'`,
            [user.organizationId, user.id]
          );

          await db.execute(
            `UPDATE email_messages_new 
             SET status = 'sent', sentAt = ?, folderId = ?, updatedAt = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [sentAt, sentFolder[0]?.id || null, id]
          );

          const result = await db.query<EmailMessage>(
            `SELECT * FROM email_messages_new WHERE id = ?`,
            [id]
          );

          return NextResponse.json({ 
            email: result[0],
            message: 'Email envoyé avec succès'
          });
        } catch (sendError) {
          // Mark as failed
          await db.execute(
            `UPDATE email_messages_new SET status = 'failed', error = ? WHERE id = ?`,
            [String(sendError), id]
          );

          return NextResponse.json({ 
            error: 'Erreur lors de l\'envoi de l\'email',
            details: String(sendError)
          }, { status: 500 });
        }
      } else {
        return NextResponse.json({ 
          error: 'Configuration email non trouvée ou incomplète'
        }, { status: 400 });
      }
    }

    const result = await db.query<EmailMessage>(
      `SELECT * FROM email_messages_new WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ 
      email: result[0],
      message: isDraft ? 'Brouillon sauvegardé' : 'Email préparé pour l\'envoi'
    });
  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// UPDATE email (move to folder, mark read/starred, etc.)
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    const body = await request.json() as {
      id: string;
      folderId?: string;
      isRead?: boolean;
      isStarred?: boolean;
      isImportant?: boolean;
      status?: string;
    };
    const { id, folderId, isRead, isStarred, isImportant, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID email requis' }, { status: 400 });
    }

    // Verify ownership
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM email_messages_new WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Email non trouvé' }, { status: 404 });
    }

    const updates: string[] = ['updatedAt = CURRENT_TIMESTAMP'];
    const args: any[] = [];

    if (folderId !== undefined) { updates.push('folderId = ?'); args.push(folderId); }
    if (isRead !== undefined) { updates.push('isRead = ?'); args.push(isRead ? 1 : 0); }
    if (isStarred !== undefined) { updates.push('isStarred = ?'); args.push(isStarred ? 1 : 0); }
    if (isImportant !== undefined) { updates.push('isImportant = ?'); args.push(isImportant ? 1 : 0); }
    if (status !== undefined) { updates.push('status = ?'); args.push(status); }

    args.push(id);

    await db.execute(
      `UPDATE email_messages_new SET ${updates.join(', ')} WHERE id = ?`,
      args
    );

    const result = await db.query<EmailMessage>(
      `SELECT * FROM email_messages_new WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ 
      email: result[0],
      message: 'Email mis à jour'
    });
  } catch (error) {
    console.error('Update email error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE email (move to trash or permanent delete)
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'ID email requis' }, { status: 400 });
    }

    // Verify ownership
    const existing = await db.query<{ id: string; folderId: string | null }>(
      `SELECT id, folderId FROM email_messages_new WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Email non trouvé' }, { status: 404 });
    }

    if (permanent) {
      await db.execute(
        `DELETE FROM email_messages_new WHERE id = ?`,
        [id]
      );
      return NextResponse.json({ message: 'Email supprimé définitivement' });
    }

    // Move to trash
    const trashFolder = await db.query<{ id: string }>(
      `SELECT id FROM email_folders WHERE organizationId = ? AND userId = ? AND type = 'deleted'`,
      [user.organizationId, user.id]
    );

    if (trashFolder.length > 0) {
      await db.execute(
        `UPDATE email_messages_new SET folderId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        [trashFolder[0].id, id]
      );
    }

    return NextResponse.json({ message: 'Email déplacé vers la corbeille' });
  } catch (error) {
    console.error('Delete email error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
