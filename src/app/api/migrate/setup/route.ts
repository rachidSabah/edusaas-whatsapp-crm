export const runtime = 'edge';

/**
 * Setup Migration Endpoint - Run database migrations
 * This endpoint is for initial setup and can be called without authentication
 */
import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { tursoExecute, tursoQuery, type CloudflareEnv } from '@/lib/turso-http';

// Get credentials from Cloudflare environment
function getCredentials() {
  try {
    const ctx = getRequestContext();
    const env = ctx.env as CloudflareEnv;
    return {
      dbUrl: env.TURSO_DATABASE_URL,
      dbToken: env.TURSO_AUTH_TOKEN
    };
  } catch {
    return { dbUrl: '', dbToken: '' };
  }
}

const PARENT_COLUMNS_MIGRATION = [
  { name: 'parent1Name', sql: `ALTER TABLE students ADD COLUMN parent1Name TEXT` },
  { name: 'parent1Phone', sql: `ALTER TABLE students ADD COLUMN parent1Phone TEXT` },
  { name: 'parent1Whatsapp', sql: `ALTER TABLE students ADD COLUMN parent1Whatsapp INTEGER DEFAULT 0` },
  { name: 'parent2Name', sql: `ALTER TABLE students ADD COLUMN parent2Name TEXT` },
  { name: 'parent2Phone', sql: `ALTER TABLE students ADD COLUMN parent2Phone TEXT` },
  { name: 'parent2Whatsapp', sql: `ALTER TABLE students ADD COLUMN parent2Whatsapp INTEGER DEFAULT 0` },
];

const ORGANIZATIONS_COLUMNS_MIGRATION = [
  { name: 'updatedAt', sql: `ALTER TABLE organizations ADD COLUMN updatedAt TEXT` },
  { name: 'locale', sql: `ALTER TABLE organizations ADD COLUMN locale TEXT DEFAULT 'fr'` },
  { name: 'timezone', sql: `ALTER TABLE organizations ADD COLUMN timezone TEXT DEFAULT 'Africa/Casablanca'` },
  { name: 'logo', sql: `ALTER TABLE organizations ADD COLUMN logo TEXT` },
  { name: 'subscriptionId', sql: `ALTER TABLE organizations ADD COLUMN subscriptionId TEXT` },
  { name: 'subscriptionEnd', sql: `ALTER TABLE organizations ADD COLUMN subscriptionEnd TEXT` },
  { name: 'whatsappSessionId', sql: `ALTER TABLE organizations ADD COLUMN whatsappSessionId TEXT` },
];

const USERS_COLUMNS_MIGRATION = [
  { name: 'phone', sql: `ALTER TABLE users ADD COLUMN phone TEXT` },
];

const WHATSAPP_TABLES_MIGRATION = [
  { name: 'whatsapp_accounts', sql: `
    CREATE TABLE IF NOT EXISTS whatsapp_accounts (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      phoneNumber TEXT NOT NULL,
      accountName TEXT,
      connectionStatus TEXT DEFAULT 'disconnected',
      deviceId TEXT,
      sessionData TEXT,
      lastConnected TEXT,
      isActive INTEGER DEFAULT 1,
      isDefault INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  ` },
  { name: 'whatsapp_notifications', sql: `
    CREATE TABLE IF NOT EXISTS whatsapp_notifications (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      studentId TEXT,
      attendanceId TEXT,
      phoneNumber TEXT NOT NULL,
      parentName TEXT,
      message TEXT NOT NULL,
      messageType TEXT NOT NULL DEFAULT 'ABSENCE',
      status TEXT DEFAULT 'sent',
      sentById TEXT,
      sentAt TEXT DEFAULT CURRENT_TIMESTAMP,
      deliveredAt TEXT,
      errorMessage TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  ` },
];

const AI_CONFIG_TABLE_MIGRATION = [
  { name: 'ai_config', sql: `
    CREATE TABLE IF NOT EXISTS ai_config (
      id TEXT PRIMARY KEY,
      organizationId TEXT NOT NULL,
      systemInstructions TEXT,
      responseTone TEXT DEFAULT 'professional',
      language TEXT DEFAULT 'auto',
      knowledgeBaseEnabled INTEGER DEFAULT 1,
      autoReplyEnabled INTEGER DEFAULT 1,
      autoReplyCategories TEXT DEFAULT '["GENERAL", "SCHEDULE", "PRICING", "ENROLLMENT"]',
      maxResponseLength INTEGER DEFAULT 500,
      includeSignature INTEGER DEFAULT 1,
      signatureText TEXT DEFAULT 'Cordialement,
L''équipe administrative',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(organizationId)
    )
  ` },
];

// System templates to seed
const SYSTEM_TEMPLATES = [
  {
    id: 'tpl_general_001',
    name: 'Message général',
    category: 'GENERAL',
    content: `Chers parents,

{Message}

Nous restons à votre disposition pour toute information complémentaire.

Cordialement,`,
    triggerAction: 'GENERAL',
    signature: 'Administration',
    variables: '["Message"]'
  },
  {
    id: 'tpl_absence_001',
    name: "Notification d'absence",
    category: 'ABSENCE_NOTIFICATION',
    content: `Chers parents,

Nous vous informons que votre enfant {StudentName}, élève du groupe {GroupName}, a été marqué(e) absent(e) ce jour, {Date}.

Nous vous prions de bien vouloir justifier cette absence en contactant l'administration dans les plus brefs délais.

Pour toute information complémentaire, n'hésitez pas à nous contacter.

Cordialement,`,
    triggerAction: 'ABSENT',
    signature: 'Administration',
    variables: '["StudentName", "GroupName", "Date"]'
  },
  {
    id: 'tpl_retard_001',
    name: 'Notification de retard',
    category: 'LATE_NOTIFICATION',
    content: `Chers parents,

Nous vous informons que votre enfant {StudentName}, élève du groupe {GroupName}, est arrivé(e) en retard le {Date} à {Time}.

Nous vous rappelons que la ponctualité est essentielle pour le bon déroulement des cours et le respect des autres élèves.

Nous vous prions de veiller à ce que votre enfant arrive à l'heure pour les prochaines séances.

Cordialement,`,
    triggerAction: 'LATE',
    signature: 'Administration',
    variables: '["StudentName", "GroupName", "Date", "Time"]'
  },
  {
    id: 'tpl_payment_001',
    name: 'Rappel de paiement',
    category: 'PAYMENT_REMINDER',
    content: `Chers parents,

Nous vous rappelons que le paiement concernant {StudentName} pour le mois de {Month} n'a pas encore été effectué.

Montant dû : {Amount} MAD
Date limite : {DueDate}

Nous vous prions de régulariser cette situation dans les plus brefs délais.

Pour toute question relative au paiement, veuillez contacter l'administration.

Cordialement,`,
    triggerAction: 'PAYMENT_DELAY',
    signature: 'Administration',
    variables: '["StudentName", "Month", "Amount", "DueDate"]'
  },
  {
    id: 'tpl_admin_001',
    name: 'Communication administrative',
    category: 'ADMIN_COMMUNICATION',
    content: `Chers parents,

{Message}

Nous restons à votre disposition pour toute information complémentaire.

Cordialement,`,
    triggerAction: 'ADMIN_COMMUNICATION',
    signature: 'Administration',
    variables: '["Message"]'
  }
];

export async function GET(request: NextRequest) {
  try {
    const { dbUrl, dbToken } = getCredentials();
    
    if (!dbToken) {
      return NextResponse.json({
        error: 'Database token not configured',
        hint: 'Set TURSO_AUTH_TOKEN environment variable in Cloudflare'
      }, { status: 500 });
    }

    // Check parent columns
    let parentColumnsStatus: { name: string; exists: boolean }[] = [];
    try {
      const result = await tursoQuery(dbUrl, dbToken, 
        `SELECT parent1Name, parent1Phone, parent1Whatsapp, parent2Name, parent2Phone, parent2Whatsapp FROM students LIMIT 1`
      );
      parentColumnsStatus = PARENT_COLUMNS_MIGRATION.map(col => ({ name: col.name, exists: true }));
    } catch (error: any) {
      if (error.message?.includes('no such column')) {
        parentColumnsStatus = PARENT_COLUMNS_MIGRATION.map(col => ({ name: col.name, exists: false }));
      } else {
        throw error;
      }
    }

    // Check organizations columns
    let orgColumnsStatus: { name: string; exists: boolean }[] = [];
    try {
      const result = await tursoQuery(dbUrl, dbToken, 
        `SELECT updatedAt, locale, timezone, logo, subscriptionId, subscriptionEnd, whatsappSessionId FROM organizations LIMIT 1`
      );
      orgColumnsStatus = ORGANIZATIONS_COLUMNS_MIGRATION.map(col => ({ name: col.name, exists: true }));
    } catch (error: any) {
      if (error.message?.includes('no such column')) {
        orgColumnsStatus = ORGANIZATIONS_COLUMNS_MIGRATION.map(col => ({ name: col.name, exists: false }));
      } else {
        throw error;
      }
    }

    // Check users columns
    let usersColumnsStatus: { name: string; exists: boolean }[] = [];
    try {
      const result = await tursoQuery(dbUrl, dbToken, 
        `SELECT phone FROM users LIMIT 1`
      );
      usersColumnsStatus = USERS_COLUMNS_MIGRATION.map(col => ({ name: col.name, exists: true }));
    } catch (error: any) {
      if (error.message?.includes('no such column')) {
        usersColumnsStatus = USERS_COLUMNS_MIGRATION.map(col => ({ name: col.name, exists: false }));
      } else {
        throw error;
      }
    }

    // Check whatsapp tables
    const tablesStatus: { name: string; exists: boolean }[] = [];
    for (const table of WHATSAPP_TABLES_MIGRATION) {
      try {
        await tursoQuery(dbUrl, dbToken, `SELECT id FROM ${table.name} LIMIT 1`);
        tablesStatus.push({ name: table.name, exists: true });
      } catch {
        tablesStatus.push({ name: table.name, exists: false });
      }
    }

    // Check ai_config table
    for (const table of AI_CONFIG_TABLE_MIGRATION) {
      try {
        await tursoQuery(dbUrl, dbToken, `SELECT id FROM ${table.name} LIMIT 1`);
        tablesStatus.push({ name: table.name, exists: true });
      } catch {
        tablesStatus.push({ name: table.name, exists: false });
      }
    }

    return NextResponse.json({
      parentColumns: parentColumnsStatus,
      organizationsColumns: orgColumnsStatus,
      whatsappTables: tablesStatus,
      needsMigration: parentColumnsStatus.some(c => !c.exists) || orgColumnsStatus.some(c => !c.exists) || tablesStatus.some(t => !t.exists)
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to check migration status',
      details: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { dbUrl, dbToken } = getCredentials();
    
    if (!dbToken) {
      return NextResponse.json({
        error: 'Database token not configured',
        hint: 'Set TURSO_AUTH_TOKEN environment variable in Cloudflare'
      }, { status: 500 });
    }

    const results: { type: string; name: string; status: string; error?: string }[] = [];

    // Run parent columns migration
    for (const migration of PARENT_COLUMNS_MIGRATION) {
      try {
        await tursoExecute(dbUrl, dbToken, migration.sql);
        results.push({ type: 'column', name: migration.name, status: 'added' });
      } catch (error: any) {
        if (error.message?.includes('duplicate column') || error.message?.includes('already exists')) {
          results.push({ type: 'column', name: migration.name, status: 'exists' });
        } else {
          results.push({ type: 'column', name: migration.name, status: 'error', error: error.message });
        }
      }
    }

    // Run organizations columns migration
    for (const migration of ORGANIZATIONS_COLUMNS_MIGRATION) {
      try {
        await tursoExecute(dbUrl, dbToken, migration.sql);
        results.push({ type: 'org_column', name: migration.name, status: 'added' });
      } catch (error: any) {
        if (error.message?.includes('duplicate column') || error.message?.includes('already exists')) {
          results.push({ type: 'org_column', name: migration.name, status: 'exists' });
        } else {
          results.push({ type: 'org_column', name: migration.name, status: 'error', error: error.message });
        }
      }
    }

    // Run users columns migration
    for (const migration of USERS_COLUMNS_MIGRATION) {
      try {
        await tursoExecute(dbUrl, dbToken, migration.sql);
        results.push({ type: 'user_column', name: migration.name, status: 'added' });
      } catch (error: any) {
        if (error.message?.includes('duplicate column') || error.message?.includes('already exists')) {
          results.push({ type: 'user_column', name: migration.name, status: 'exists' });
        } else {
          results.push({ type: 'user_column', name: migration.name, status: 'error', error: error.message });
        }
      }
    }

    // Run whatsapp tables migration
    for (const migration of WHATSAPP_TABLES_MIGRATION) {
      try {
        await tursoExecute(dbUrl, dbToken, migration.sql);
        results.push({ type: 'table', name: migration.name, status: 'created' });
      } catch (error: any) {
        if (error.message?.includes('already exists') || error.message?.includes('table')) {
          results.push({ type: 'table', name: migration.name, status: 'exists' });
        } else {
          results.push({ type: 'table', name: migration.name, status: 'error', error: error.message });
        }
      }
    }

    // Run ai_config table migration
    for (const migration of AI_CONFIG_TABLE_MIGRATION) {
      try {
        await tursoExecute(dbUrl, dbToken, migration.sql);
        results.push({ type: 'table', name: migration.name, status: 'created' });
      } catch (error: any) {
        if (error.message?.includes('already exists') || error.message?.includes('table')) {
          results.push({ type: 'table', name: migration.name, status: 'exists' });
        } else {
          results.push({ type: 'table', name: migration.name, status: 'error', error: error.message });
        }
      }
    }

    // Seed system templates
    const now = new Date().toISOString();
    for (const template of SYSTEM_TEMPLATES) {
      try {
        // Check if template exists
        const existing = await tursoQuery(dbUrl, dbToken,
          `SELECT id FROM templates WHERE id = ?`,
          [template.id]
        );

        if (existing.length === 0) {
          // Insert new template
          await tursoExecute(dbUrl, dbToken,
            `INSERT INTO templates (id, organizationId, name, category, content, triggerAction, signature, variables, isSystem, isActive, createdAt, updatedAt)
             VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
            [template.id, template.name, template.category, template.content, template.triggerAction, template.signature, template.variables, now, now]
          );
          results.push({ type: 'template', name: template.name, status: 'created' });
        } else {
          results.push({ type: 'template', name: template.name, status: 'exists' });
        }
      } catch (error: any) {
        results.push({ type: 'template', name: template.name, status: 'error', error: error.message });
      }
    }

    return NextResponse.json({
      message: 'Migration completed',
      results
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Migration failed',
      details: error.message
    }, { status: 500 });
  }
}
