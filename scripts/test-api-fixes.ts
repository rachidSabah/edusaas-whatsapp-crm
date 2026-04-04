// Test API fixes directly against database
import { createClient } from '@libsql/client/web';

const TURSO_URL = 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';

const httpsUrl = TURSO_URL.replace('libsql://', 'https://');

async function main() {
  const client = createClient({ url: httpsUrl, authToken: TURSO_TOKEN });
  
  console.log('=== Testing API Fixes ===\n');
  
  // Test 1: Courses INSERT with both title and name
  console.log('--- Test 1: Courses INSERT ---');
  const testCourseId = `course_test_${Date.now()}`;
  try {
    await client.execute({
      sql: `INSERT INTO courses (id, organizationId, title, name, code, description, duration, fee, isActive)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [testCourseId, 'org_1773318948848_gbk3n5e8d', 'Test Course', 'Test Course', 'TEST-001', 'Test Description', '10 hours', 500]
    });
    console.log('✓ Courses INSERT successful');
    
    // Verify the insert
    const result = await client.execute({
      sql: `SELECT id, organizationId, COALESCE(name, title) as name, code, description, duration, fee, isActive FROM courses WHERE id = ?`,
      args: [testCourseId]
    });
    console.log(`  Course: ${JSON.stringify(result.rows[0])}`);
    
    // Clean up
    await client.execute({ sql: `DELETE FROM courses WHERE id = ?`, args: [testCourseId] });
    console.log('✓ Cleaned up test course');
  } catch (error: any) {
    console.log(`✗ Courses INSERT failed: ${error.message}`);
  }
  
  // Test 2: Groups INSERT
  console.log('\n--- Test 2: Groups INSERT ---');
  const testGroupId = `grp_test_${Date.now()}`;
  try {
    await client.execute({
      sql: `INSERT INTO groups (id, organizationId, name, code, description, schedule, teacherId, capacity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [testGroupId, 'org_1773318948848_gbk3n5e8d', 'Test Group', 'GRP-001', 'Test Description', null, null, 30]
    });
    console.log('✓ Groups INSERT successful');
    
    // Verify the insert
    const result = await client.execute({
      sql: `SELECT id, organizationId, name, code, description, capacity, currentYear FROM groups WHERE id = ?`,
      args: [testGroupId]
    });
    console.log(`  Group: ${JSON.stringify(result.rows[0])}`);
    
    // Clean up
    await client.execute({ sql: `DELETE FROM groups WHERE id = ?`, args: [testGroupId] });
    console.log('✓ Cleaned up test group');
  } catch (error: any) {
    console.log(`✗ Groups INSERT failed: ${error.message}`);
  }
  
  // Test 3: Admin user login verification
  console.log('\n--- Test 3: Admin User Verification ---');
  const admin = await client.execute({
    sql: `SELECT id, email, name, role, organizationId, isActive FROM users WHERE email = ?`,
    args: ['admin@edusaas.ma']
  });
  if (admin.rows.length > 0) {
    const user = admin.rows[0];
    console.log(`✓ Admin user exists:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  OrganizationId: ${user.organizationId}`);
    console.log(`  IsActive: ${user.isActive}`);
  } else {
    console.log('✗ Admin user not found!');
  }
  
  console.log('\n=== All Tests Complete ===');
}

main().catch(console.error);
