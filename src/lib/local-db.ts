// Local SQLite Database Client
// Provides fallback to local SQLite when Turso is not available

import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    // Use local.db for the full database, not custom.db
    const dbPath = path.join(process.cwd(), 'db/local.db');
    console.log('Using database at:', dbPath);
    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export interface LocalUser {
  id: string;
  email: string;
  password: string;
  name: string;
  avatar: string | null;
  role: string;
  organizationId: string | null;
  isActive: number;
}

export interface LocalOrganization {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  isActive: number;
}

/**
 * Check if we should use local database (Turso not available)
 */
export function shouldUseLocalDb(): boolean {
  return true; // Always use local for now since Turso token expired
}

/**
 * Query local SQLite database
 */
export function localQuery<T = Record<string, unknown>>(sql: string, args: unknown[] = []): T[] {
  const database = getDb();
  
  try {
    const stmt = database.prepare(sql);
    const results = stmt.all(...args) as T[];
    return results;
  } catch (error) {
    console.error('Local DB query error:', error);
    return [];
  }
}

/**
 * Execute statement on local SQLite database
 */
export function localExecute(sql: string, args: unknown[] = []): void {
  const database = getDb();
  
  try {
    const stmt = database.prepare(sql);
    stmt.run(...args);
  } catch (error) {
    console.error('Local DB execute error:', error);
  }
}

/**
 * Get user by email from local database
 */
export function getLocalUserByEmail(email: string): LocalUser | null {
  const users = localQuery<LocalUser>(
    'SELECT id, email, password, name, avatar, role, organizationId, isActive FROM users WHERE email = ?',
    [email.toLowerCase()]
  );
  return users[0] || null;
}

/**
 * Get user by ID from local database
 */
export function getLocalUserById(id: string): LocalUser | null {
  const users = localQuery<LocalUser>(
    'SELECT id, email, password, name, avatar, role, organizationId, isActive FROM users WHERE id = ?',
    [id]
  );
  return users[0] || null;
}

/**
 * Update user last login
 */
export function updateLocalUserLastLogin(userId: string): void {
  localExecute(
    "UPDATE users SET lastLogin = datetime('now') WHERE id = ?",
    [userId]
  );
}

/**
 * Get organization by ID
 */
export function getLocalOrganizationById(id: string): LocalOrganization | null {
  const orgs = localQuery<LocalOrganization>(
    'SELECT id, name, slug, email, phone, address, city, isActive FROM organizations WHERE id = ?',
    [id]
  );
  return orgs[0] || null;
}

/**
 * Generic query function that matches Turso interface
 */
export async function queryLocalOrTurso<T = Record<string, unknown>>(
  sql: string, 
  args: unknown[] = [],
  tursoUrl?: string,
  tursoToken?: string
): Promise<T[]> {
  // Always use local for now
  return localQuery<T>(sql, args);
}

// Close database connection on process exit
process.on('exit', () => {
  if (db) {
    db.close();
  }
});
