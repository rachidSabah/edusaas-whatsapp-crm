// Script to check database tables and organization
import { createClient } from '@libsql/client';

const TURSO_URL = 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';

const db = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

async function main() {
  console.log('=== Checking Database Schema ===\n');

  // Check if courses table exists
  try {
    const courses = await db.execute(`SELECT id, name, organizationId FROM courses LIMIT 5`);
    console.log('✅ Courses table exists');
    console.log('Current courses:', courses.rows.length);
  } catch (e: any) {
    console.log('❌ Courses table error:', e.message);
    console.log('Creating courses table...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        code TEXT,
        description TEXT,
        duration TEXT,
        fee REAL DEFAULT 0,
        isActive INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(organizationId, code)
      )
    `);
    console.log('✅ Courses table created');
  }

  // Check organizations
  console.log('\n=== Organizations ===');
  const orgs = await db.execute(`SELECT id, name, slug, email FROM organizations`);
  console.table(orgs.rows);

  // Create an organization for the new admin if needed
  const adminEmail = 'admin@edusaas.ma';
  const adminUser = await db.execute({
    sql: `SELECT id, organizationId FROM users WHERE email = ?`,
    args: [adminEmail]
  });

  if (adminUser.rows.length > 0) {
    const admin = adminUser.rows[0] as any;
    if (!admin.organizationId) {
      console.log('\n⚠ Admin user has no organization. Will be auto-created on login.');
    } else {
      console.log(`\n✓ Admin user has organization: ${admin.organizationId}`);
    }
  }

  // Check templates table
  console.log('\n=== Checking Templates ===');
  try {
    const templates = await db.execute(`SELECT id, name, category FROM templates LIMIT 5`);
    console.log('✅ Templates table exists');
    console.log('Templates count:', templates.rows.length);
  } catch (e: any) {
    console.log('❌ Templates table error:', e.message);
  }

  console.log('\n=== Summary ===');
  console.log('Both admin users should now be able to login with: Santafee@@@@@1972');
  console.log('- admin@edusaas.ma');
  console.log('- rachidelsabah@gmail.com');
}

main().catch(console.error);
