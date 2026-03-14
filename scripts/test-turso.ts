import { createClient } from '@libsql/client';

const db = createClient({
  url: 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzMwNzk5MzIsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.27cVp2oTN2J-gzAL6u1GXguQ4IRGZzIGrGt1HY-OiO1fcKD0qukVp9_oFy4Wv9ka0XF_PvXjynFmYgDR0l4yAA',
});

async function main() {
  console.log('Testing Turso connection...');
  const result = await db.execute('SELECT * FROM users WHERE email = ?', ['admin@edusaas.ma']);
  console.log('Users found:', result.rows.length);
  if (result.rows.length > 0) {
    console.log('Admin user:', result.rows[0].email, result.rows[0].name, result.rows[0].role);
  }
}

main().catch(console.error);
