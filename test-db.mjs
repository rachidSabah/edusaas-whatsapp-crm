// Test database connection and check table structure
const TURSO_URL = 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';

const httpUrl = TURSO_URL.replace('libsql://', 'https://');

async function execute(sql) {
  const response = await fetch(`${httpUrl}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TURSO_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        type: 'execute',
        stmt: { sql, args: [] },
      }],
    }),
  });
  return response.json();
}

async function main() {
  console.log('=== Checking courses table ===');
  const coursesSchema = await execute("PRAGMA table_info(courses)");
  console.log(JSON.stringify(coursesSchema, null, 2));
  
  console.log('\n=== Checking groups table ===');
  const groupsSchema = await execute("PRAGMA table_info(groups)");
  console.log(JSON.stringify(groupsSchema, null, 2));
  
  console.log('\n=== Checking users table ===');
  const usersSchema = await execute("PRAGMA table_info(users)");
  console.log(JSON.stringify(usersSchema, null, 2));
  
  console.log('\n=== Checking admin user ===');
  const adminUser = await execute("SELECT id, email, name, role, organizationId, isActive FROM users WHERE email = 'admin@edusaas.ma'");
  console.log(JSON.stringify(adminUser, null, 2));
}

main().catch(console.error);
