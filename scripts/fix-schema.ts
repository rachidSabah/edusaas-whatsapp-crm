// Fix database schema to match API expectations
import { createClient } from '@libsql/client/web';

const TURSO_URL = 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';

const httpsUrl = TURSO_URL.replace('libsql://', 'https://');

async function executeSQL(client: any, sql: string, description: string) {
  try {
    await client.execute(sql);
    console.log(`✓ ${description}`);
    return true;
  } catch (error: any) {
    if (error.message.includes('duplicate column') || error.message.includes('already exists')) {
      console.log(`⚠ ${description} - Column already exists`);
      return true;
    }
    console.log(`✗ ${description}: ${error.message}`);
    return false;
  }
}

async function main() {
  const client = createClient({ url: httpsUrl, authToken: TURSO_TOKEN });
  
  console.log('=== Fixing Database Schema ===\n');
  
  // Fix courses table
  console.log('--- Courses Table ---');
  await executeSQL(client, `ALTER TABLE courses ADD COLUMN name TEXT`, 'Adding name column to courses');
  await executeSQL(client, `ALTER TABLE courses ADD COLUMN code TEXT`, 'Adding code column to courses');
  await executeSQL(client, `ALTER TABLE courses ADD COLUMN duration TEXT`, 'Adding duration column to courses');
  await executeSQL(client, `ALTER TABLE courses ADD COLUMN fee REAL DEFAULT 0`, 'Adding fee column to courses');
  
  // Copy data from title to name if name is null
  try {
    await client.execute(`UPDATE courses SET name = title WHERE name IS NULL OR name = ''`);
    console.log('✓ Copied title to name for existing courses');
  } catch (e: any) {
    console.log(`⚠ Could not copy title to name: ${e.message}`);
  }
  
  // Fix groups table
  console.log('\n--- Groups Table ---');
  await executeSQL(client, `ALTER TABLE groups ADD COLUMN year1StartDate TEXT`, 'Adding year1StartDate to groups');
  await executeSQL(client, `ALTER TABLE groups ADD COLUMN year1EndDate TEXT`, 'Adding year1EndDate to groups');
  await executeSQL(client, `ALTER TABLE groups ADD COLUMN year2StartDate TEXT`, 'Adding year2StartDate to groups');
  await executeSQL(client, `ALTER TABLE groups ADD COLUMN year2EndDate TEXT`, 'Adding year2EndDate to groups');
  await executeSQL(client, `ALTER TABLE groups ADD COLUMN currentYear INTEGER DEFAULT 1`, 'Adding currentYear to groups');
  
  // Migrate existing data
  try {
    await client.execute(`UPDATE groups SET currentYear = yearLevel WHERE currentYear IS NULL AND yearLevel IS NOT NULL`);
    console.log('✓ Migrated yearLevel to currentYear');
  } catch (e: any) {
    console.log(`⚠ Could not migrate yearLevel: ${e.message}`);
  }
  
  // Fix teachers table - add missing columns
  console.log('\n--- Teachers Table ---');
  await executeSQL(client, `ALTER TABLE teachers ADD COLUMN firstName TEXT`, 'Adding firstName to teachers');
  await executeSQL(client, `ALTER TABLE teachers ADD COLUMN lastName TEXT`, 'Adding lastName to teachers');
  await executeSQL(client, `ALTER TABLE teachers ADD COLUMN fullName TEXT`, 'Adding fullName to teachers');
  await executeSQL(client, `ALTER TABLE teachers ADD COLUMN status TEXT DEFAULT 'ACTIVE'`, 'Adding status to teachers');
  
  // Migrate name to fullName
  try {
    await client.execute(`UPDATE teachers SET fullName = name WHERE fullName IS NULL OR fullName = ''`);
    console.log('✓ Migrated name to fullName for teachers');
  } catch (e: any) {
    console.log(`⚠ Could not migrate teacher names: ${e.message}`);
  }
  
  // Verify the changes
  console.log('\n=== Verification ===\n');
  
  const coursesCheck = await client.execute(`SELECT * FROM courses LIMIT 1`);
  console.log(`Courses columns: ${coursesCheck.columns.join(', ')}`);
  
  const groupsCheck = await client.execute(`SELECT * FROM groups LIMIT 1`);
  console.log(`Groups columns: ${groupsCheck.columns.join(', ')}`);
  
  const teachersCheck = await client.execute(`SELECT * FROM teachers LIMIT 1`);
  console.log(`Teachers columns: ${teachersCheck.columns.join(', ')}`);
}

main().catch(console.error);
