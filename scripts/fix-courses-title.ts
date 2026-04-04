// Fix courses table - make title nullable or sync with name
import { createClient } from '@libsql/client/web';

const TURSO_URL = 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM1ODQwNTQsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.jrNADBvhQKy2_2QB-8H7qXaAS4FRMDa2tlXCQijVJ72RLdbkrddy6tAcTSNy5_JekQPA3oMLcqORMjI-1kR3DA';

const httpsUrl = TURSO_URL.replace('libsql://', 'https://');

async function main() {
  const client = createClient({ url: httpsUrl, authToken: TURSO_TOKEN });
  
  // Get table info
  const tableInfo = await client.execute(`PRAGMA table_info(courses)`);
  console.log('Courses table structure:');
  console.log(JSON.stringify(tableInfo.rows, null, 2));
  
  // Since SQLite doesn't support ALTER COLUMN to drop NOT NULL,
  // we need to update the API to include title in INSERT
  console.log('\nSolution: Update API to include title in INSERT statement');
}

main().catch(console.error);
