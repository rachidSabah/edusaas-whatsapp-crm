// Backup Library for Turso Database
import { getDbContext } from './db-context';

export interface BackupData {
  version: string;
  timestamp: string;
  organizationId: string | null;
  organizationName: string | null;
  tables: {
    [tableName: string]: any[];
  };
  checksum: string;
}

const BACKUP_TABLES = [
  'organizations',
  'users',
  'contacts',
  'students',
  'parents',
  'groups',
  'attendance',
  'templates',
  'knowledge_base',
  'conversations',
  'messages',
  'classrooms',
  'courses',
  'teachers',
  'academic_years',
  'archives',
  'activities',
];

// Generate SHA-256 checksum
export async function generateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Export all data for an organization
export async function exportOrganizationData(organizationId: string): Promise<BackupData> {
  const db = getDbContext();
  const tables: { [key: string]: any[] } = {};

  // Get organization info
  const orgResult = await db.query<{ name: string }>(
    `SELECT name FROM organizations WHERE id = ?`,
    [organizationId]
  );
  const organizationName = orgResult[0]?.name || null;

  // Export organization-specific tables
  const orgTables = [
    { name: 'users', orgFilter: true },
    { name: 'contacts', orgFilter: true },
    { name: 'students', orgFilter: true },
    { name: 'parents', orgFilter: true },
    { name: 'groups', orgFilter: true },
    { name: 'attendance', orgFilter: true },
    { name: 'templates', orgFilter: true },
    { name: 'knowledge_base', orgFilter: true },
    { name: 'conversations', orgFilter: true },
    { name: 'messages', orgFilter: true },
    { name: 'classrooms', orgFilter: true },
    { name: 'courses', orgFilter: true },
    { name: 'teachers', orgFilter: true },
    { name: 'academic_years', orgFilter: true },
    { name: 'archives', orgFilter: true },
    { name: 'activities', orgFilter: true },
  ];

  for (const table of orgTables) {
    try {
      const rows = await db.query(
        `SELECT * FROM ${table.name} WHERE organizationId = ?`,
        [organizationId]
      );
      tables[table.name] = rows;
    } catch (error) {
      console.error(`Error exporting table ${table.name}:`, error);
      tables[table.name] = [];
    }
  }

  // Add organization itself
  const orgData = await db.query(`SELECT * FROM organizations WHERE id = ?`, [organizationId]);
  tables['organizations'] = orgData;

  const backupData: BackupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    organizationId,
    organizationName,
    tables,
    checksum: '',
  };

  // Generate checksum
  const dataString = JSON.stringify({ ...backupData, checksum: '' });
  backupData.checksum = await generateChecksum(dataString);

  return backupData;
}

// Export all data (super admin only)
export async function exportAllData(): Promise<BackupData> {
  const db = getDbContext();
  const tables: { [key: string]: any[] } = {};

  for (const tableName of BACKUP_TABLES) {
    try {
      const rows = await db.query(`SELECT * FROM ${tableName}`, []);
      tables[tableName] = rows;
    } catch (error) {
      console.error(`Error exporting table ${tableName}:`, error);
      tables[tableName] = [];
    }
  }

  const backupData: BackupData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    organizationId: null,
    organizationName: 'Full System Backup',
    tables,
    checksum: '',
  };

  const dataString = JSON.stringify({ ...backupData, checksum: '' });
  backupData.checksum = await generateChecksum(dataString);

  return backupData;
}

// Verify backup checksum
export async function verifyBackup(backup: BackupData): Promise<boolean> {
  const storedChecksum = backup.checksum;
  const dataString = JSON.stringify({ ...backup, checksum: '' });
  const computedChecksum = await generateChecksum(dataString);
  return storedChecksum === computedChecksum;
}

// Restore data from backup
export async function restoreBackup(
  backup: BackupData,
  options: {
    organizationId?: string;
    overwrite?: boolean;
    tables?: string[];
  } = {}
): Promise<{ success: boolean; message: string; restored: { [key: string]: number } }> {
  const db = getDbContext();
  const restored: { [key: string]: number } = {};

  // Verify checksum
  const isValid = await verifyBackup(backup);
  if (!isValid) {
    return { success: false, message: 'Invalid backup: checksum verification failed', restored };
  }

  const tablesToRestore = options.tables || Object.keys(backup.tables);

  for (const tableName of tablesToRestore) {
    const rows = backup.tables[tableName];
    if (!rows || rows.length === 0) continue;

    try {
      // Clear existing data if overwrite is enabled
      if (options.overwrite && options.organizationId) {
        // Check if table has organizationId column
        if (['users', 'contacts', 'students', 'parents', 'groups', 'attendance', 
             'templates', 'knowledge_base', 'conversations', 'messages', 
             'classrooms', 'courses', 'teachers', 'academic_years', 'archives', 
             'activities'].includes(tableName)) {
          await db.execute(
            `DELETE FROM ${tableName} WHERE organizationId = ?`,
            [options.organizationId]
          );
        }
      }

      // Insert data
      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = columns.map(() => '?').join(', ');
        
        await db.execute(
          `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`,
          values
        );
      }

      restored[tableName] = rows.length;
    } catch (error) {
      console.error(`Error restoring table ${tableName}:`, error);
      restored[tableName] = 0;
    }
  }

  return {
    success: true,
    message: 'Backup restored successfully',
    restored,
  };
}

// Create backup record
export async function createBackupRecord(
  organizationId: string,
  type: 'full' | 'incremental',
  size: number,
  recordCount: number
): Promise<string> {
  const db = getDbContext();
  const id = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await db.execute(
    `INSERT INTO backup_history (id, organizationId, type, size, recordCount, status)
     VALUES (?, ?, ?, ?, ?, 'completed')`,
    [id, organizationId, type, size, recordCount]
  );

  return id;
}

// Get backup history
export async function getBackupHistory(organizationId: string): Promise<any[]> {
  const db = getDbContext();
  return db.query(
    `SELECT * FROM backup_history WHERE organizationId = ? ORDER BY createdAt DESC LIMIT 20`,
    [organizationId]
  );
}

// Generate backup filename
export function generateBackupFilename(organizationName: string | null): string {
  const date = new Date().toISOString().split('T')[0];
  const name = organizationName?.replace(/[^a-zA-Z0-9]/g, '_') || 'system';
  return `edusaas_backup_${name}_${date}.json`;
}
