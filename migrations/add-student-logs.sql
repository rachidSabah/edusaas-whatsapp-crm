-- Migration: Add student_logs table
-- Run this SQL against your D1 database

-- Student logs (discipline, incidents, etc.)
CREATE TABLE IF NOT EXISTS student_logs (
  id TEXT PRIMARY KEY,
  studentId TEXT NOT NULL,
  organizationId TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'incident',
  category TEXT DEFAULT 'general',
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  actionTaken TEXT,
  followUpRequired INTEGER DEFAULT 0,
  followUpDate TEXT,
  followUpNotes TEXT,
  reportedByName TEXT,
  witnessNames TEXT,
  location TEXT,
  parentNotified INTEGER DEFAULT 0,
  parentNotifiedAt TEXT,
  parentNotifiedBy TEXT,
  resolution TEXT,
  resolvedAt TEXT,
  resolvedBy TEXT,
  attachments TEXT,
  createdBy TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);
