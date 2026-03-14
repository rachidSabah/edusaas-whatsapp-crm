import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const db = createClient({
  url: 'libsql://edusaas-rachidelsabah.aws-eu-west-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzMwNzk5MzIsImlkIjoiMDE5Y2QzY2MtN2YwMS03ODZjLTljMTctNDgzNjRiZmQyNmY4IiwicmlkIjoiNDRhZjk3NDYtZWQ1YS00ZTUyLWE5MDMtNTlmOTE0YWRiYjFkIn0.27cVp2oTN2J-gzAL6u1GXguQ4IRGZzIGrGt1HY-OiO1fcKD0qukVp9_oFy4Wv9ka0XF_PvXjynFmYgDR0l4yAA',
});

async function main() {
  console.log('Creating organizations table...');
  
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        logo TEXT,
        email TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        city TEXT,
        country TEXT DEFAULT 'Morocco',
        timezone TEXT DEFAULT 'Africa/Casablanca',
        locale TEXT DEFAULT 'fr',
        plan TEXT DEFAULT 'starter',
        subscriptionId TEXT,
        subscriptionEnd TEXT,
        isActive INTEGER DEFAULT 1,
        whatsappSessionId TEXT,
        whatsappConnected INTEGER DEFAULT 0,
        whatsappPhone TEXT,
        aiEnabled INTEGER DEFAULT 1,
        aiDailyLimit INTEGER DEFAULT 1000,
        aiDailyUsed INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ Organizations table created');
  } catch (e: any) {
    console.log('⚠', e.message);
  }

  // Insert admin user
  console.log('\nCreating admin user...');
  const hashedPassword = await bcrypt.hash('Santafee@@@@@1972', 12);
  
  try {
    await db.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, password, name, role, isActive) VALUES (?, ?, ?, ?, ?, 1)`,
      args: ['admin_001', 'admin@edusaas.ma', hashedPassword, 'Super Admin', 'SUPER_ADMIN']
    });
    console.log('✓ Admin user created');
    console.log('\n🔐 Login: admin@edusaas.ma / Santafee@@@@@1972');
  } catch (e: any) {
    console.log('⚠', e.message);
  }
  
  console.log('\n✅ Done!');
}

main().catch(console.error);
