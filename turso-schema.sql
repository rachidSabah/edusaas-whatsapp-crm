// Multi-Tenant AI WhatsApp CRM - Turso/libSQL Schema
// Run this schema directly on Turso

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
  whatsappQRCode TEXT,
  aiEnabled INTEGER DEFAULT 1,
  aiDailyLimit INTEGER DEFAULT 1000,
  aiDailyUsed INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

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
);

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
);

CREATE INDEX idx_contacts_org ON contacts(organizationId);

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
  -- Administration fields
  disciplineNotes TEXT,
  incidentNotes TEXT,
  performanceNotes TEXT,
  absences TEXT DEFAULT '[]',
  retards TEXT DEFAULT '[]',
  avertissements INTEGER DEFAULT 0,
  miseAPied INTEGER DEFAULT 0,
  -- Parent 1 Information
  parent1Name TEXT,
  parent1Phone TEXT,
  parent1Whatsapp INTEGER DEFAULT 0,
  -- Parent 2 Information
  parent2Name TEXT,
  parent2Phone TEXT,
  parent2Whatsapp INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organizationId, studentId)
);

CREATE INDEX idx_students_org ON students(organizationId);
CREATE INDEX idx_students_status ON students(organizationId, status);

CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  fullName TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  relationship TEXT DEFAULT 'parent',
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organizationId, phone)
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  schedule TEXT,
  teacherId TEXT,
  capacity INTEGER,
  -- Study period fields
  year1StartDate TEXT,
  year1EndDate TEXT,
  year2StartDate TEXT,
  year2EndDate TEXT,
  currentYear INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organizationId, name)
);

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
);

CREATE INDEX idx_attendance_org_date ON attendance(organizationId, date);

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
);

CREATE INDEX idx_templates_org ON templates(organizationId);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_trigger ON templates(triggerAction);

-- System default templates (no organizationId, isSystem = 1)
-- These will be used as base templates that users can customize

INSERT OR IGNORE INTO templates (id, organizationId, name, category, content, isSystem, triggerAction, signature) VALUES
('tpl_absence_001', NULL, 'Notification d''absence', 'ABSENCE_NOTIFICATION', 'Chers parents,

Nous vous informons que votre enfant {StudentName} du groupe {GroupName} a été marqué(e) absent(e) le {Date}.

Nous vous prions de bien vouloir justifier cette absence en contactant l''administration dans les plus brefs délais.

Pour toute information complémentaire, n''hésitez pas à nous contacter.

Cordialement,', 1, 'ABSENT', 'Administration {organisation}'),

('tpl_retard_001', NULL, 'Notification de retard', 'LATE_NOTIFICATION', 'Chers parents,

Nous vous informons que votre enfant {StudentName} du groupe {GroupName} est arrivé(e) en retard le {Date} à {Time}.

Nous vous rappelons que la ponctualité est essentielle pour le bon déroulement des cours et le respect des autres élèves.

Nous vous prions de veiller à ce que votre enfant arrive à l''heure pour les prochaines séances.

Cordialement,', 1, 'LATE', 'Administration {organisation}'),

('tpl_payment_001', NULL, 'Rappel de paiement', 'PAYMENT_REMINDER', 'Chers parents,

Nous vous rappelons que le paiement concernant {StudentName} pour le mois de {Month} n''a pas encore été effectué.

Montant dû : {Amount} MAD
Date limite : {DueDate}

Nous vous prions de régulariser cette situation dans les plus brefs délais.

Pour toute question relative au paiement, veuillez contacter l''administration.

Cordialement,', 1, 'PAYMENT_DELAY', 'Administration {organisation}'),

('tpl_admin_001', NULL, 'Communication administrative', 'ADMIN_COMMUNICATION', 'Chers parents,

{Message}

Nous restons à votre disposition pour toute information complémentaire.

Cordialement,', 1, 'ADMIN_COMMUNICATION', '{organisation}');

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
);

CREATE INDEX idx_knowledge_org_cat ON knowledge_base(organizationId, category);

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
);

CREATE INDEX idx_conversations_org_status ON conversations(organizationId, status);
CREATE INDEX idx_conversations_org_contact ON conversations(organizationId, contactId);

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
);

CREATE INDEX idx_messages_org_conv ON messages(organizationId, conversationId);
CREATE INDEX idx_messages_org_date ON messages(organizationId, createdAt);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  userId TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId TEXT,
  details TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activities_org_date ON activities(organizationId, createdAt);

-- Insert default admin user (password: Santafee@@@@@1972)
-- $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.WFG/a0AvT1nA.q
INSERT OR IGNORE INTO users (id, email, password, name, role, isActive)
VALUES ('admin_001', 'admin@edusaas.ma', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.WFG/a0AvT1nA.q', 'Super Admin', 'SUPER_ADMIN', 1);

-- Backup History Table
CREATE TABLE IF NOT EXISTS backup_history (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'full',
  size INTEGER DEFAULT 0,
  recordCount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  downloadUrl TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_backup_org ON backup_history(organizationId);

-- Courses Table
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
);

CREATE INDEX idx_courses_org ON courses(organizationId);

-- Teachers Table
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
);

CREATE INDEX idx_teachers_org ON teachers(organizationId);

-- Classrooms Table
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
);

CREATE INDEX idx_classrooms_org ON classrooms(organizationId);

-- Academic Years Table
CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_academic_years_org ON academic_years(organizationId);

-- Archives Table
CREATE TABLE IF NOT EXISTS archives (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entityType TEXT NOT NULL,
  entityId TEXT NOT NULL,
  data TEXT NOT NULL,
  archivedById TEXT REFERENCES users(id),
  reason TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_archives_org ON archives(organizationId);
CREATE INDEX idx_archives_type ON archives(organizationId, entityType);

-- Schedule Table for session scheduling
CREATE TABLE IF NOT EXISTS schedule (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  timeSlot TEXT,
  courseId TEXT REFERENCES courses(id),
  teacherId TEXT REFERENCES teachers(id),
  classroomId TEXT REFERENCES classrooms(id),
  groupId TEXT REFERENCES groups(id),
  notes TEXT,
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schedule_org ON schedule(organizationId);
CREATE INDEX idx_schedule_date ON schedule(organizationId, date);
CREATE INDEX idx_schedule_group ON schedule(organizationId, groupId);

-- Promotion History Table
CREATE TABLE IF NOT EXISTS promotion_history (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fromYear INTEGER,
  toYear INTEGER,
  fromStatus TEXT,
  toStatus TEXT,
  promotedById TEXT REFERENCES users(id),
  academicYear TEXT,
  notes TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_promotion_org ON promotion_history(organizationId);
CREATE INDEX idx_promotion_student ON promotion_history(studentId);

-- Documents Table for PDF/DOCX knowledge base files
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER DEFAULT 0,
  content TEXT,
  extractedText TEXT,
  uploadedById TEXT REFERENCES users(id),
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_documents_org ON documents(organizationId);
CREATE INDEX idx_documents_type ON documents(organizationId, type);

-- Email Configuration Table
CREATE TABLE IF NOT EXISTS email_config (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT DEFAULT 'smtp',
  smtpHost TEXT,
  smtpPort INTEGER DEFAULT 587,
  smtpUser TEXT,
  smtpPassword TEXT,
  imapHost TEXT,
  imapPort INTEGER DEFAULT 993,
  imapUser TEXT,
  imapPassword TEXT,
  popHost TEXT,
  popPort INTEGER DEFAULT 995,
  popUser TEXT,
  popPassword TEXT,
  brevoApiKey TEXT,
  mailchimpApiKey TEXT,
  mailchimpListId TEXT,
  gmailClientId TEXT,
  gmailClientSecret TEXT,
  gmailRefreshToken TEXT,
  fromEmail TEXT,
  fromName TEXT,
  isDefault INTEGER DEFAULT 0,
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_config_org ON email_config(organizationId);

-- Email Messages Table
CREATE TABLE IF NOT EXISTS email_messages (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  configId TEXT REFERENCES email_config(id),
  toEmail TEXT NOT NULL,
  toName TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sentAt TEXT,
  error TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_messages_org ON email_messages(organizationId);

-- Student Notes Table for discipline, performance, incidents
CREATE TABLE IF NOT EXISTS student_notes (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  studentId TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  note TEXT NOT NULL,
  recordedById TEXT REFERENCES users(id),
  date TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_student_notes_org ON student_notes(organizationId);
CREATE INDEX idx_student_notes_student ON student_notes(studentId);

-- AI Configuration Table for storing AI behavior settings per organization
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
);

CREATE INDEX idx_ai_config_org ON ai_config(organizationId);

-- AI Interactions Table for storing conversation history
CREATE TABLE IF NOT EXISTS ai_interactions (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversationId TEXT NOT NULL,
  userMessage TEXT NOT NULL,
  aiResponse TEXT NOT NULL,
  knowledgeBaseUsed INTEGER DEFAULT 0,
  model TEXT,
  tokensUsed INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_interactions_org ON ai_interactions(organizationId);
CREATE INDEX idx_ai_interactions_conv ON ai_interactions(organizationId, conversationId);
CREATE INDEX idx_ai_interactions_date ON ai_interactions(organizationId, createdAt);

-- WhatsApp Accounts Table for multi-account support (up to 2 accounts per organization)
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phoneNumber TEXT NOT NULL,
  accountName TEXT,
  connectionStatus TEXT DEFAULT 'disconnected',
  deviceId TEXT,
  sessionData TEXT,
  lastConnected TEXT,
  isActive INTEGER DEFAULT 1,
  isDefault INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_whatsapp_accounts_org ON whatsapp_accounts(organizationId);

-- Baileys Sessions Table for WhatsApp Web connections
CREATE TABLE IF NOT EXISTS baileys_sessions (
  id TEXT PRIMARY KEY,
  phoneNumber TEXT NOT NULL UNIQUE,
  sessionData TEXT NOT NULL DEFAULT '{}',
  qrCode TEXT,
  status TEXT DEFAULT 'disconnected',
  lastActivity TEXT DEFAULT CURRENT_TIMESTAMP,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_baileys_sessions_status ON baileys_sessions(status);
CREATE INDEX idx_baileys_sessions_phone ON baileys_sessions(phoneNumber);

-- WhatsApp Notification Log Table for tracking all sent messages
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  studentId TEXT REFERENCES students(id) ON DELETE SET NULL,
  attendanceId TEXT REFERENCES attendance(id) ON DELETE SET NULL,
  phoneNumber TEXT NOT NULL,
  parentName TEXT,
  message TEXT NOT NULL,
  messageType TEXT NOT NULL DEFAULT 'ABSENCE',
  -- Message types: ABSENCE, LATE, PAYMENT_DELAY, ADMIN_COMMUNICATION, GENERAL
  status TEXT DEFAULT 'sent',
  -- Status: pending, sent, delivered, failed
  sentById TEXT REFERENCES users(id),
  sentAt TEXT DEFAULT CURRENT_TIMESTAMP,
  deliveredAt TEXT,
  errorMessage TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_whatsapp_notifications_org ON whatsapp_notifications(organizationId);
CREATE INDEX idx_whatsapp_notifications_student ON whatsapp_notifications(studentId);
CREATE INDEX idx_whatsapp_notifications_type ON whatsapp_notifications(organizationId, messageType);
CREATE INDEX idx_whatsapp_notifications_date ON whatsapp_notifications(organizationId, createdAt);

-- Tasks/Assignments Table for School Manager to assign work to users/teachers
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assignedToId TEXT REFERENCES users(id) ON DELETE SET NULL,
  assignedToType TEXT DEFAULT 'USER', -- USER or TEACHER
  createdBy TEXT NOT NULL REFERENCES users(id),
  dueDate TEXT NOT NULL,
  startDate TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, OVERDUE
  priority TEXT DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
  progress INTEGER DEFAULT 0,
  attachments TEXT, -- JSON array of file paths
  completedAt TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_org ON tasks(organizationId);
CREATE INDEX idx_tasks_assigned ON tasks(assignedToId);
CREATE INDEX idx_tasks_status ON tasks(organizationId, status);
CREATE INDEX idx_tasks_due ON tasks(organizationId, dueDate);

-- Internal Chat Messages Table for real-time messaging between users
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  senderId TEXT NOT NULL REFERENCES users(id),
  senderName TEXT NOT NULL,
  senderRole TEXT NOT NULL,
  receiverId TEXT REFERENCES users(id), -- NULL for broadcast messages
  receiverName TEXT,
  content TEXT NOT NULL,
  isRead INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_messages_org ON chat_messages(organizationId);
CREATE INDEX idx_chat_messages_sender ON chat_messages(senderId);
CREATE INDEX idx_chat_messages_receiver ON chat_messages(receiverId);
CREATE INDEX idx_chat_messages_date ON chat_messages(organizationId, createdAt);

-- Email Folders for organizing emails
CREATE TABLE IF NOT EXISTS email_folders (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'custom', -- inbox, sent, drafts, junk, deleted, custom
  parentId TEXT REFERENCES email_folders(id),
  orderIndex INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_folders_org ON email_folders(organizationId);
CREATE INDEX idx_email_folders_user ON email_folders(userId);

-- Email messages enhanced with folder support
CREATE TABLE IF NOT EXISTS email_messages_new (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  configId TEXT REFERENCES email_config(id),
  folderId TEXT REFERENCES email_folders(id),
  userId TEXT REFERENCES users(id),
  -- For outgoing emails
  toEmail TEXT,
  toName TEXT,
  cc TEXT,
  bcc TEXT,
  -- For incoming emails
  fromEmail TEXT,
  fromName TEXT,
  replyTo TEXT,
  -- Common fields
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  htmlBody TEXT,
  attachments TEXT, -- JSON array
  -- Status
  direction TEXT DEFAULT 'outbound', -- inbound, outbound
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, failed, draft
  isRead INTEGER DEFAULT 0,
  isStarred INTEGER DEFAULT 0,
  isImportant INTEGER DEFAULT 0,
  messageid TEXT, -- Email Message-ID header
  inReplyTo TEXT, -- Original Message-ID for threading
  sentAt TEXT,
  receivedAt TEXT,
  error TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_messages_new_org ON email_messages_new(organizationId);
CREATE INDEX idx_email_messages_new_user ON email_messages_new(userId);
CREATE INDEX idx_email_messages_new_folder ON email_messages_new(folderId);
CREATE INDEX idx_email_messages_new_status ON email_messages_new(organizationId, status);
