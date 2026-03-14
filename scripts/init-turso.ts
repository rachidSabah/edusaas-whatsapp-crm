import { createClient } from '@libsql/client';
import * as fs from 'fs';

const db = createClient({
  url: 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzMwNzk5MzIsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.27cVp2oTN2J-gzAL6u1GXguQ4IRGZzIGrGt1HY-OiO1fcKD0qukVp9_oFy4Wv9ka0XF_PvXjynFmYgDR0l4yAA',
});

const schema = fs.readFileSync('./turso-schema.sql', 'utf-8');
const statements = schema.split(';').filter(s => s.trim());

async function main() {
  console.log('Applying schema to Turso...\n');
  
  for (const stmt of statements) {
    if (stmt.trim()) {
      try {
        await db.execute(stmt);
        console.log('✓', stmt.substring(0, 60).replace(/\n/g, ' ') + '...');
      } catch (e: any) {
        if (!e.message.includes('already exists')) {
          console.log('⚠', e.message.substring(0, 80));
        }
      }
    }
  }
  console.log('\n✅ Schema applied to Turso!');
}

main().catch(console.error);
