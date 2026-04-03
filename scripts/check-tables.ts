// Check if all required tables exist and have correct columns
import { createClient } from '@libsql/client/web';

const TURSO_URL = 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';

const httpsUrl = TURSO_URL.replace('libsql://', 'https://');

async function main() {
  const client = createClient({ url: httpsUrl, authToken: TURSO_TOKEN });
  
  // Check all tables
  const tables = ['users', 'organizations', 'courses', 'groups', 'students', 'teachers', 'attendance', 'templates', 'contacts'];
  
  console.log('=== Checking Tables ===\n');
  
  for (const table of tables) {
    try {
      const result = await client.execute(`SELECT * FROM ${table} LIMIT 1`);
      console.log(`✓ Table "${table}" exists (${result.columns.length} columns)`);
      console.log(`  Columns: ${result.columns.join(', ')}`);
    } catch (error: any) {
      console.log(`✗ Table "${table}" ERROR: ${error.message}`);
    }
  }
  
  // Check users table
  console.log('\n=== Users ===\n');
  const users = await client.execute(`SELECT id, email, name, role, organizationId, isActive FROM users`);
  for (const user of users.rows) {
    console.log(`User: ${user.email} | Role: ${user.role} | Org: ${user.organizationId} | Active: ${user.isActive}`);
  }
  
  // Check organizations table
  console.log('\n=== Organizations ===\n');
  const orgs = await client.execute(`SELECT id, name, slug, email FROM organizations`);
  for (const org of orgs.rows) {
    console.log(`Org: ${org.name} | ID: ${org.id} | Email: ${org.email}`);
  }
}

main().catch(console.error);
