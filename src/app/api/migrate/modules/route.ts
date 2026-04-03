export const runtime = 'edge';

/**
 * Database Migration Endpoint for New Modules
 * Creates all tables needed for the 16 modules
 * This is backward compatible - only adds new tables
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

const CREATE_TABLES_SQL = [
  // Module 2: Courses
  `CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    durationHours INTEGER DEFAULT 0,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Module 3: Teachers
  `CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    speciality TEXT,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Module 5: Classrooms
  `CREATE TABLE IF NOT EXISTS classrooms (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL,
    name TEXT NOT NULL,
    capacity INTEGER DEFAULT 30,
    location TEXT,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Module 9: Academic Years
  `CREATE TABLE IF NOT EXISTS academic_years (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL,
    name TEXT NOT NULL,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    durationMonths INTEGER DEFAULT 9,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Module 1: Schedule
  `CREATE TABLE IF NOT EXISTS schedule (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL,
    date TEXT NOT NULL,
    timeSlot TEXT,
    courseId TEXT,
    teacherId TEXT,
    classroomId TEXT,
    groupId TEXT,
    notes TEXT,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Module 16: WhatsApp Accounts
  `CREATE TABLE IF NOT EXISTS whatsapp_accounts (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL,
    phoneNumber TEXT NOT NULL,
    accountName TEXT,
    connectionStatus TEXT DEFAULT 'disconnected',
    sessionToken TEXT,
    sessionData TEXT,
    deviceId TEXT,
    lastConnected TEXT,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Module 15: Graduated Students Archive
  `CREATE TABLE IF NOT EXISTS graduated_students_archive (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL,
    originalStudentId TEXT NOT NULL,
    studentName TEXT NOT NULL,
    studentEmail TEXT,
    studentPhone TEXT,
    groupName TEXT,
    academicYears TEXT,
    coursesCompleted TEXT,
    attendanceSummary TEXT,
    graduationDate TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )`,
];

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Only SUPER_ADMIN can run migrations
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only SUPER_ADMIN can run migrations' },
        { status: 403 }
      );
    }

    const db = getDbContext();
    const results: { table: string; status: string; error?: string }[] = [];

    for (const sql of CREATE_TABLES_SQL) {
      try {
        await db.execute(sql);
        const tableMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
        if (tableMatch) {
          results.push({ table: tableMatch[1], status: 'created' });
        }
      } catch (error: any) {
        const tableMatch = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
        if (tableMatch) {
          if (error.message?.includes('already exists')) {
            results.push({ table: tableMatch[1], status: 'exists' });
          } else {
            results.push({ table: tableMatch[1], status: 'error', error: error.message });
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Migration completed',
      results,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    const tables = await db.query<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name IN 
       ('courses', 'teachers', 'classrooms', 'academic_years', 'schedule', 
        'whatsapp_accounts', 'graduated_students_archive')`
    );

    return NextResponse.json({
      migrationStatus: tables.length > 0 ? 'migrated' : 'not_migrated',
      tables: tables.map(t => t.name),
    });
  } catch (error: any) {
    console.error('Migration check error:', error);
    return NextResponse.json(
      { error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}
