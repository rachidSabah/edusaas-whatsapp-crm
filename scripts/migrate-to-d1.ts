#!/usr/bin/env node
/**
 * Data Migration Script: Turso to Cloudflare D1
 * 
 * This script exports data from Turso database and generates SQL statements
 * to import into Cloudflare D1.
 * 
 * Usage:
 * 1. Create D1 database: wrangler d1 create edusaas-db
 * 2. Copy the database_id to wrangler.toml
 * 3. Run schema: wrangler d1 execute edusaas-db --file=./d1-schema.sql
 * 4. Run this script: npx ts-node scripts/migrate-to-d1.ts
 * 5. Import data: wrangler d1 execute edusaas-db --file=./d1-data.sql
 */

const TURSO_URL = 'https://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';

// Tables to migrate (in order of dependencies)
const TABLES = [
  'organizations',
  'users',
  'academic_years',
  'courses',
  'classrooms',
  'teachers',
  'parents',
  'groups',
  'students',
  'attendance',
  'schedule',
  'student_logs',
  'contacts',
  'conversations',
  'messages',
  'templates',
  'knowledge_base',
  'ai_config',
  'ai_automation_config',
  'absence_notification_config',
  'absence_notifications',
  'whatsapp_accounts',
  'whatsapp_meta_numbers',
  'whatsapp_notifications',
  'baileys_sessions',
  'webhook_config',
  'email_config',
  'email_folders',
  'email_messages_new',
  'tasks',
  'activities',
  'backup_history',
  'promotion_history',
  'graduated_students_archive',
];

async function tursoQuery(sql: string, args: any[] = []): Promise<any[]> {
  const formattedArgs = args.map(arg => {
    if (arg === null) return { type: 'null' };
    if (typeof arg === 'string') return { type: 'text', value: arg };
    if (typeof arg === 'number') return { type: arg % 1 === 0 ? 'integer' : 'float', value: arg };
    if (typeof arg === 'boolean') return { type: 'integer', value: arg ? 1 : 0 };
    return { type: 'text', value: String(arg) };
  });

  const response = await fetch(`${TURSO_URL}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        type: 'execute',
        stmt: { sql, args: formattedArgs },
      }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Turso error: ${response.status} - ${text}`);
  }

  const json = await response.json();
  const cols = json?.results?.[0]?.response?.result?.cols || [];
  const rows = json?.results?.[0]?.response?.result?.rows || [];

  return rows.map((row: any[]) => {
    const obj: Record<string, any> = {};
    cols.forEach((col: { name: string }, i: number) => {
      const cell = row[i];
      obj[col.name] = cell?.value ?? null;
    });
    return obj;
  });
}

function escapeValue(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  // Escape single quotes for SQL
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function exportTable(tableName: string): Promise<string[]> {
  console.log(`Exporting table: ${tableName}`);
  
  const rows = await tursoQuery(`SELECT * FROM ${tableName}`);
  console.log(`  Found ${rows.length} rows`);
  
  if (rows.length === 0) {
    return [];
  }

  const columns = Object.keys(rows[0]);
  const insertStatements: string[] = [];

  for (const row of rows) {
    const values = columns.map(col => escapeValue(row[col])).join(', ');
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});`;
    insertStatements.push(sql);
  }

  return insertStatements;
}

async function main() {
  console.log('=== Starting Turso to D1 Migration ===\n');
  
  const allStatements: string[] = [];
  allStatements.push('-- D1 Data Migration from Turso');
  allStatements.push(`-- Generated: ${new Date().toISOString()}`);
  allStatements.push('-- Run this after creating tables with d1-schema.sql\n');

  for (const table of TABLES) {
    try {
      const statements = await exportTable(table);
      if (statements.length > 0) {
        allStatements.push(`\n-- ${table}: ${statements.length} rows`);
        allStatements.push(...statements);
      }
    } catch (error) {
      console.error(`Error exporting ${table}:`, error);
    }
  }

  // Write to file
  const output = allStatements.join('\n');
  const fs = await import('fs');
  fs.writeFileSync('./d1-data.sql', output);
  
  console.log('\n=== Migration Complete ===');
  console.log('Data exported to: ./d1-data.sql');
  console.log('\nNext steps:');
  console.log('1. wrangler d1 create edusaas-db');
  console.log('2. Update wrangler.toml with the database_id');
  console.log('3. wrangler d1 execute edusaas-db --file=./d1-schema.sql');
  console.log('4. wrangler d1 execute edusaas-db --file=./d1-data.sql');
}

main().catch(console.error);
