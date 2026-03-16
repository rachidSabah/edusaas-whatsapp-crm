export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

interface EmailConfig {
  id: string;
  organizationId: string;
  provider: string;
  smtpHost: string | null;
  smtpPort: number;
  smtpUser: string | null;
  smtpPassword: string | null;
  imapHost: string | null;
  imapPort: number;
  imapUser: string | null;
  imapPassword: string | null;
  popHost: string | null;
  popPort: number | null;
  popUser: string | null;
  popPassword: string | null;
  brevoApiKey: string | null;
  gmailClientId: string | null;
  gmailClientSecret: string | null;
  gmailRefreshToken: string | null;
  fromEmail: string | null;
  fromName: string | null;
  isDefault: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// GET email configurations
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ configs: [] });
    }

    const configs = await db.query<EmailConfig>(
      `SELECT * FROM email_config WHERE organizationId = ? ORDER BY isDefault DESC, createdAt DESC`,
      [user.organizationId]
    );

    // Mask passwords in response
    const safeConfigs = configs.map(config => ({
      ...config,
      smtpPassword: config.smtpPassword ? '••••••••' : null,
      imapPassword: config.imapPassword ? '••••••••' : null,
      popPassword: config.popPassword ? '••••••••' : null,
      brevoApiKey: config.brevoApiKey ? '••••••••' : null,
      gmailClientSecret: config.gmailClientSecret ? '••••••••' : null,
      gmailRefreshToken: config.gmailRefreshToken ? '••••••••' : null,
    }));

    return NextResponse.json({ configs: safeConfigs });
  } catch (error) {
    console.error('Get email configs error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// CREATE or UPDATE email configuration
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json({ error: 'Aucune organisation associée' }, { status: 400 });
    }

    const body = await request.json() as {
      id?: string;
      provider?: string;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPassword?: string;
      imapHost?: string;
      imapPort?: number;
      imapUser?: string;
      imapPassword?: string;
      brevoApiKey?: string;
      gmailClientId?: string;
      gmailClientSecret?: string;
      gmailRefreshToken?: string;
      fromEmail?: string;
      fromName?: string;
      isDefault?: boolean;
      isActive?: boolean;
    };
    const {
      id,
      provider,
      // SMTP settings
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      // IMAP settings
      imapHost,
      imapPort,
      imapUser,
      imapPassword,
      // POP settings
      popHost,
      popPort,
      popUser,
      popPassword,
      // Provider-specific
      brevoApiKey,
      gmailClientId,
      gmailClientSecret,
      gmailRefreshToken,
      // From settings
      fromEmail,
      fromName,
      isDefault,
      isActive
    } = body;

    // Check if updating existing or creating new
    if (id) {
      // Verify ownership
      const existing = await db.query<{ id: string }>(
        `SELECT id FROM email_config WHERE id = ? AND organizationId = ?`,
        [id, user.organizationId]
      );

      if (existing.length === 0) {
        return NextResponse.json({ error: 'Configuration non trouvée' }, { status: 404 });
      }

      // Build update with only provided fields
      const updates: string[] = ['updatedAt = CURRENT_TIMESTAMP'];
      const args: any[] = [];

      if (provider !== undefined) { updates.push('provider = ?'); args.push(provider); }
      if (smtpHost !== undefined) { updates.push('smtpHost = ?'); args.push(smtpHost); }
      if (smtpPort !== undefined) { updates.push('smtpPort = ?'); args.push(smtpPort); }
      if (smtpUser !== undefined) { updates.push('smtpUser = ?'); args.push(smtpUser); }
      if (smtpPassword && !smtpPassword.startsWith('•')) { 
        updates.push('smtpPassword = ?'); 
        args.push(smtpPassword); 
      }
      if (imapHost !== undefined) { updates.push('imapHost = ?'); args.push(imapHost); }
      if (imapPort !== undefined) { updates.push('imapPort = ?'); args.push(imapPort); }
      if (imapUser !== undefined) { updates.push('imapUser = ?'); args.push(imapUser); }
      if (imapPassword && !imapPassword.startsWith('•')) { 
        updates.push('imapPassword = ?'); 
        args.push(imapPassword); 
      }
      if (popHost !== undefined) { updates.push('popHost = ?'); args.push(popHost); }
      if (popPort !== undefined) { updates.push('popPort = ?'); args.push(popPort); }
      if (popUser !== undefined) { updates.push('popUser = ?'); args.push(popUser); }
      if (popPassword && !popPassword.startsWith('•')) { 
        updates.push('popPassword = ?'); 
        args.push(popPassword); 
      }
      if (brevoApiKey && !brevoApiKey.startsWith('•')) { 
        updates.push('brevoApiKey = ?'); 
        args.push(brevoApiKey); 
      }
      if (gmailClientId !== undefined) { updates.push('gmailClientId = ?'); args.push(gmailClientId); }
      if (gmailClientSecret && !gmailClientSecret.startsWith('•')) { 
        updates.push('gmailClientSecret = ?'); 
        args.push(gmailClientSecret); 
      }
      if (gmailRefreshToken && !gmailRefreshToken.startsWith('•')) { 
        updates.push('gmailRefreshToken = ?'); 
        args.push(gmailRefreshToken); 
      }
      if (fromEmail !== undefined) { updates.push('fromEmail = ?'); args.push(fromEmail); }
      if (fromName !== undefined) { updates.push('fromName = ?'); args.push(fromName); }
      if (isDefault !== undefined) { updates.push('isDefault = ?'); args.push(isDefault ? 1 : 0); }
      if (isActive !== undefined) { updates.push('isActive = ?'); args.push(isActive ? 1 : 0); }

      args.push(id);

      await db.execute(
        `UPDATE email_config SET ${updates.join(', ')} WHERE id = ?`,
        args
      );

      // If setting as default, unset others
      if (isDefault) {
        await db.execute(
          `UPDATE email_config SET isDefault = 0 WHERE organizationId = ? AND id != ?`,
          [user.organizationId, id]
        );
      }

      const result = await db.query<EmailConfig>(
        `SELECT * FROM email_config WHERE id = ?`,
        [id]
      );

      return NextResponse.json({ 
        config: result[0],
        message: 'Configuration mise à jour avec succès'
      });
    }

    // Create new configuration
    if (!provider || !fromEmail) {
      return NextResponse.json({ 
        error: 'Le fournisseur et l\'email d\'envoi sont requis' 
      }, { status: 400 });
    }

    const newId = `ec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // If this is the first config or marked as default, unset others
    if (isDefault) {
      await db.execute(
        `UPDATE email_config SET isDefault = 0 WHERE organizationId = ?`,
        [user.organizationId]
      );
    }

    await db.execute(
      `INSERT INTO email_config 
       (id, organizationId, provider, smtpHost, smtpPort, smtpUser, smtpPassword,
        imapHost, imapPort, imapUser, imapPassword, popHost, popPort, popUser, popPassword, brevoApiKey, 
        gmailClientId, gmailClientSecret, gmailRefreshToken,
        fromEmail, fromName, isDefault, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        newId,
        user.organizationId,
        provider,
        smtpHost || null,
        smtpPort || 587,
        smtpUser || null,
        smtpPassword || null,
        imapHost || null,
        imapPort || 993,
        imapUser || null,
        imapPassword || null,
        popHost || null,
        popPort || 995,
        popUser || null,
        popPassword || null,
        brevoApiKey || null,
        gmailClientId || null,
        gmailClientSecret || null,
        gmailRefreshToken || null,
        fromEmail,
        fromName || null,
        isDefault ? 1 : 0,
        isActive !== false ? 1 : 0
      ]
    );

    const result = await db.query<EmailConfig>(
      `SELECT * FROM email_config WHERE id = ?`,
      [newId]
    );

    return NextResponse.json({ 
      config: result[0],
      message: 'Configuration créée avec succès'
    });
  } catch (error) {
    console.error('Save email config error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE email configuration
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID de configuration requis' }, { status: 400 });
    }

    // Verify ownership
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM email_config WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Configuration non trouvée' }, { status: 404 });
    }

    await db.execute(
      `DELETE FROM email_config WHERE id = ?`,
      [id]
    );

    return NextResponse.json({ 
      success: true,
      message: 'Configuration supprimée avec succès'
    });
  } catch (error) {
    console.error('Delete email config error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
