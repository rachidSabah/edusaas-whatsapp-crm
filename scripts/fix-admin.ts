// Script to fix admin user in Turso database
import { createClient } from '@libsql/client';

const TURSO_URL = 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';

const db = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

async function main() {
  console.log('=== Fixing Admin Users ===\n');

  // Check all users
  const users = await db.execute(`SELECT id, email, name, role, organizationId, isActive FROM users`);
  console.log('Current users:');
  console.table(users.rows);

  // Create admin@edusaas.ma with a new unique ID
  const adminId = `admin_${Date.now()}`;
  
  try {
    await db.execute({
      sql: `INSERT INTO users (id, email, password, name, role, isActive) VALUES (?, ?, ?, ?, ?, 1)`,
      args: [adminId, 'admin@edusaas.ma', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.WFG/a0AvT1nA.q', 'Super Admin', 'SUPER_ADMIN']
    });
    console.log(`\n✅ Created admin@edusaas.ma with SUPER_ADMIN role (id: ${adminId})`);
  } catch (e: any) {
    if (e.message?.includes('UNIQUE constraint failed: users.email')) {
      console.log('\n⚠ admin@edusaas.ma already exists, updating role to SUPER_ADMIN...');
      await db.execute({
        sql: `UPDATE users SET role = 'SUPER_ADMIN', isActive = 1 WHERE email = ?`,
        args: ['admin@edusaas.ma']
      });
      console.log('✅ Updated admin@edusaas.ma to SUPER_ADMIN');
    } else {
      console.error('Error:', e.message);
    }
  }

  // Also update rachidelsabah@gmail.com to SUPER_ADMIN so both can work
  console.log('\n=== Updating rachidelsabah@gmail.com ===');
  await db.execute({
    sql: `UPDATE users SET role = 'SUPER_ADMIN' WHERE email = ?`,
    args: ['rachidelsabah@gmail.com']
  });
  console.log('✅ Updated rachidelsabah@gmail.com to SUPER_ADMIN');

  // Verify changes
  console.log('\n=== Final User List ===');
  const finalUsers = await db.execute(`SELECT id, email, name, role, organizationId, isActive FROM users`);
  console.table(finalUsers.rows);

  console.log('\n=== Login Credentials ===');
  console.log('Admin: admin@edusaas.ma / Santafee@@@@@1972');
  console.log('Admin: rachidelsabah@gmail.com / Santafee@@@@@1972');
}

main().catch(console.error);
