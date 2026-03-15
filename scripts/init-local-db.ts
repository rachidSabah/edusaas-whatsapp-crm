/**
 * Initialize local SQLite database for development
 * This creates a local database when Turso is not accessible
 */

import { Database } from 'bun:sqlite';

const dbPath = '/home/z/my-project/db/local.db';

// Create database
const db = new Database(dbPath);

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

console.log('Creating local database schema...');

// Organizations table
db.run(`
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

// Users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    role TEXT DEFAULT 'CHAT_OPERATOR',
    locale TEXT DEFAULT 'fr',
    organizationId TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    emailVerified TEXT,
    lastLogin TEXT,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Contacts table
db.run(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT,
    email TEXT,
    tags TEXT DEFAULT 'PROSPECT',
    customFields TEXT,
    source TEXT,
    leadStatus TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    lastContactAt TEXT,
    UNIQUE(organizationId, phone)
  )
`);

// Students table
db.run(`
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    fullName TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    dateOfBirth TEXT,
    gender TEXT,
    address TEXT,
    studentId TEXT,
    program TEXT,
    groupId TEXT,
    parentId TEXT,
    enrollmentDate TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'ACTIVE',
    currentYear INTEGER DEFAULT 1,
    notes TEXT,
    disciplineNotes TEXT,
    incidentNotes TEXT,
    performanceNotes TEXT,
    absences TEXT DEFAULT '[]',
    retards TEXT DEFAULT '[]',
    avertissements INTEGER DEFAULT 0,
    miseAPied INTEGER DEFAULT 0,
    parent1Name TEXT,
    parent1Phone TEXT,
    parent1Whatsapp INTEGER DEFAULT 0,
    parent2Name TEXT,
    parent2Phone TEXT,
    parent2Whatsapp INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organizationId, studentId)
  )
`);

// Groups table
db.run(`
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    schedule TEXT,
    teacherId TEXT,
    capacity INTEGER,
    year1StartDate TEXT,
    year1EndDate TEXT,
    year2StartDate TEXT,
    year2EndDate TEXT,
    currentYear INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organizationId, name)
  )
`);

// Attendance table
db.run(`
  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    groupId TEXT REFERENCES groups(id),
    date TEXT NOT NULL,
    session TEXT,
    status TEXT DEFAULT 'PRESENT',
    notes TEXT,
    markedById TEXT REFERENCES users(id),
    parentNotified INTEGER DEFAULT 0,
    notifiedAt TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organizationId, studentId, date)
  )
`);

// Templates table
db.run(`
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    organizationId TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'GENERAL',
    subject TEXT,
    content TEXT NOT NULL,
    variables TEXT,
    isSystem INTEGER DEFAULT 0,
    triggerAction TEXT,
    signature TEXT DEFAULT 'Administration',
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Teachers table
db.run(`
  CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    fullName TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialization TEXT,
    status TEXT DEFAULT 'ACTIVE',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Courses table
db.run(`
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

// Classrooms table
db.run(`
  CREATE TABLE IF NOT EXISTS classrooms (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    capacity INTEGER DEFAULT 30,
    building TEXT,
    floor TEXT,
    facilities TEXT,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organizationId, code)
  )
`);

// Tasks table
db.run(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assignedToId TEXT REFERENCES users(id) ON DELETE SET NULL,
    assignedToType TEXT DEFAULT 'USER',
    createdBy TEXT NOT NULL REFERENCES users(id),
    dueDate TEXT NOT NULL,
    startDate TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'PENDING',
    priority TEXT DEFAULT 'MEDIUM',
    progress INTEGER DEFAULT 0,
    attachments TEXT,
    completedAt TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Conversations table
db.run(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    contactId TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    priority TEXT DEFAULT 'normal',
    assignedToId TEXT REFERENCES users(id),
    aiEnabled INTEGER DEFAULT 1,
    lastAiReply TEXT,
    category TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    lastMessageAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Messages table
db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    conversationId TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mediaUrl TEXT,
    mediaType TEXT,
    direction TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    senderId TEXT REFERENCES users(id),
    isAiGenerated INTEGER DEFAULT 0,
    aiConfidence REAL,
    whatsappId TEXT UNIQUE,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Knowledge base table
db.run(`
  CREATE TABLE IF NOT EXISTS knowledge_base (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'GENERAL',
    keywords TEXT,
    priority INTEGER DEFAULT 0,
    isActive INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// AI Config table
db.run(`
  CREATE TABLE IF NOT EXISTS ai_config (
    id TEXT PRIMARY KEY,
    organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    systemInstructions TEXT,
    responseTone TEXT DEFAULT 'professional',
    language TEXT DEFAULT 'auto',
    knowledgeBaseEnabled INTEGER DEFAULT 1,
    autoReplyEnabled INTEGER DEFAULT 1,
    autoReplyCategories TEXT DEFAULT '["GENERAL", "SCHEDULE", "PRICING", "ENROLLMENT"]',
    maxResponseLength INTEGER DEFAULT 500,
    includeSignature INTEGER DEFAULT 1,
    signatureText TEXT DEFAULT 'Cordialement,\nL''équipe administrative',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organizationId)
  )
`);

// Insert default organization
db.run(`
  INSERT OR IGNORE INTO organizations (id, name, slug, email, phone, address, city, plan, isActive)
  VALUES ('org_001', 'EduSaaS Demo', 'edusaas-demo', 'contact@edusaas.ma', '+212600000000', '123 Rue Example', 'Casablanca', 'premium', 1)
`);

// Insert admin user with password hash
// Password: Santafee@@@@@1972
// SHA-256 hash
db.run(`
  INSERT OR IGNORE INTO users (id, email, password, name, role, organizationId, isActive)
  VALUES (
    'admin_001', 
    'rachidelsabah@gmail.com', 
    'sha256$e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'Rachid El Sabah', 
    'SUPER_ADMIN', 
    'org_001', 
    1
  )
`);

// Also create the old admin email
db.run(`
  INSERT OR IGNORE INTO users (id, email, password, name, role, organizationId, isActive)
  VALUES (
    'admin_002', 
    'admin@edusaas.ma', 
    'sha256$e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'Super Admin', 
    'SUPER_ADMIN', 
    'org_001', 
    1
  )
`);

// Insert default templates
const templates = [
  {
    id: 'tpl_absence_001',
    name: "Notification d'absence",
    category: 'ABSENCE_NOTIFICATION',
    content: `Chers parents,

Nous vous informons que votre enfant {StudentName} du groupe {GroupName} a été marqué(e) absent(e) le {Date}.

Nous vous prions de bien vouloir justifier cette absence en contactant l'administration dans les plus brefs délais.

Pour toute information complémentaire, n'hésitez pas à nous contacter.

Cordialement,`,
    triggerAction: 'ABSENT',
    signature: 'Administration {organisation}'
  },
  {
    id: 'tpl_retard_001',
    name: 'Notification de retard',
    category: 'LATE_NOTIFICATION',
    content: `Chers parents,

Nous vous informons que votre enfant {StudentName} du groupe {GroupName} est arrivé(e) en retard le {Date} à {Time}.

Nous vous rappelons que la ponctualité est essentielle pour le bon déroulement des cours et le respect des autres élèves.

Nous vous prions de veiller à ce que votre enfant arrive à l'heure pour les prochaines séances.

Cordialement,`,
    triggerAction: 'LATE',
    signature: 'Administration {organisation}'
  },
  {
    id: 'tpl_payment_001',
    name: 'Rappel de paiement',
    category: 'PAYMENT_REMINDER',
    content: `Chers parents,

Nous vous rappelons que le paiement concernant {StudentName} pour le mois de {Month} n'a pas encore été effectué.

Montant dû : {Amount} MAD
Date limite : {DueDate}

Nous vous prions de régulariser cette situation dans les plus brefs délais.

Pour toute question relative au paiement, veuillez contacter l'administration.

Cordialement,`,
    triggerAction: 'PAYMENT_DELAY',
    signature: 'Administration {organisation}'
  }
];

const insertTemplate = db.prepare(`
  INSERT OR IGNORE INTO templates (id, organizationId, name, category, content, isSystem, triggerAction, signature)
  VALUES ($id, NULL, $name, $category, $content, 1, $triggerAction, $signature)
`);

for (const tpl of templates) {
  insertTemplate.run({
    $id: tpl.id,
    $name: tpl.name,
    $category: tpl.category,
    $content: tpl.content,
    $triggerAction: tpl.triggerAction,
    $signature: tpl.signature
  });
}

db.close();

console.log('Local database created successfully at:', dbPath);
console.log('Admin user created:');
console.log('  Email: rachidelsabah@gmail.com');
console.log('  Password: Santafee@@@@@1972');
