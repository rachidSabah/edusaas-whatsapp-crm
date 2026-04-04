// Verify database schema matches API expectations
import { createClient } from '@libsql/client/web';

const TURSO_URL = 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';

const httpsUrl = TURSO_URL.replace('libsql://', 'https://');

async function main() {
  const client = createClient({ url: httpsUrl, authToken: TURSO_TOKEN });
  
  console.log('=== Verifying Schema Fixes ===\n');
  
  // Test INSERT into courses
  console.log('--- Testing Courses INSERT ---');
  const testCourseId = `test_course_${Date.now()}`;
  try {
    await client.execute({
      sql: `INSERT INTO courses (id, organizationId, name, code, description, duration, fee, isActive)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [testCourseId, 'org_1773318948848_gbk3n5e8d', 'Test Course', 'TEST-001', 'Test Description', '10 hours', 500]
    });
    console.log('✓ Courses INSERT successful');
    
    // Verify the insert
    const result = await client.execute({
      sql: `SELECT * FROM courses WHERE id = ?`,
      args: [testCourseId]
    });
    console.log(`  Inserted course: ${JSON.stringify(result.rows[0])}`);
    
    // Clean up test
    await client.execute({ sql: `DELETE FROM courses WHERE id = ?`, args: [testCourseId] });
    console.log('✓ Test course cleaned up');
  } catch (error: any) {
    console.log(`✗ Courses INSERT failed: ${error.message}`);
  }
  
  // Test INSERT into groups
  console.log('\n--- Testing Groups INSERT ---');
  const testGroupId = `test_group_${Date.now()}`;
  try {
    await client.execute({
      sql: `INSERT INTO groups (id, organizationId, name, code, description, schedule, teacherId, capacity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testGroupId, 'org_1773318948848_gbk3n5e8d', 'Test Group', 'GRP-001', 'Test Description', null, null, 30]
    });
    console.log('✓ Groups INSERT successful');
    
    // Verify the insert
    const result = await client.execute({
      sql: `SELECT * FROM groups WHERE id = ?`,
      args: [testGroupId]
    });
    console.log(`  Inserted group: ${JSON.stringify(result.rows[0])}`);
    
    // Clean up test
    await client.execute({ sql: `DELETE FROM groups WHERE id = ?`, args: [testGroupId] });
    console.log('✓ Test group cleaned up');
  } catch (error: any) {
    console.log(`✗ Groups INSERT failed: ${error.message}`);
  }
  
  // Check admin user
  console.log('\n--- Checking Admin User ---');
  const adminCheck = await client.execute({
    sql: `SELECT id, email, name, role, organizationId, isActive FROM users WHERE email = ?`,
    args: ['admin@edusaas.ma']
  });
  if (adminCheck.rows.length > 0) {
    console.log(`✓ Admin user found: ${JSON.stringify(adminCheck.rows[0])}`);
  } else {
    console.log('✗ Admin user not found!');
  }
}

main().catch(console.error);
