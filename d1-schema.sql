-- Cloudflare D1 Database Schema for EduSaaS
-- This file defines the complete database schema for the EduSaaS application

-- Organizations table (must be first due to foreign key constraints)
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

-- Users table
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
  phone TEXT,
  whatsappStatus TEXT DEFAULT 'disconnected',
  whatsappNumber TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Academic years
CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  name TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  durationMonths INTEGER DEFAULT 9,
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  title TEXT NOT NULL,
  name TEXT,
  code TEXT,
  description TEXT,
  duration TEXT,
  durationHours INTEGER DEFAULT 0,
  fee REAL DEFAULT 0,
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  schedule TEXT,
  teacherId TEXT,
  capacity INTEGER,
  academicYearId TEXT,
  yearLevel INTEGER DEFAULT 1,
  startDate TEXT,
  endDate TEXT,
  year1StartDate TEXT,
  year1EndDate TEXT,
  year2StartDate TEXT,
  year2EndDate TEXT,
  currentYear INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organizationId, name)
);

-- Classrooms table
CREATE TABLE IF NOT EXISTS classrooms (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER DEFAULT 30,
  location TEXT,
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  name TEXT NOT NULL,
  firstName TEXT,
  lastName TEXT,
  fullName TEXT,
  email TEXT,
  phone TEXT,
  speciality TEXT,
  status TEXT DEFAULT 'ACTIVE',
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Parents table
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

-- Students table
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
  parent2Id TEXT,
  guardian1Name TEXT,
  guardian1Phone TEXT,
  guardian1Relationship TEXT DEFAULT 'parent',
  guardian2Name TEXT,
  guardian2Phone TEXT,
  guardian2Relationship TEXT DEFAULT 'parent',
  parent1Name TEXT,
  parent1Phone TEXT,
  parent1Whatsapp INTEGER DEFAULT 0,
  parent2Name TEXT,
  parent2Phone TEXT,
  parent2Whatsapp INTEGER DEFAULT 0,
  currentYear INTEGER DEFAULT 1,
  enrollmentDate TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'ACTIVE',
  notes TEXT,
  disciplineNotes TEXT,
  incidentNotes TEXT,
  performanceNotes TEXT,
  absences TEXT DEFAULT '[]',
  retards TEXT DEFAULT '[]',
  avertissements INTEGER DEFAULT 0,
  miseAPied INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organizationId, studentId)
);

-- Attendance table
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
  scheduleId TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organizationId, studentId, date)
);

-- Schedule table
CREATE TABLE IF NOT EXISTS schedule (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  date TEXT NOT NULL,
  startTime TEXT,
  endTime TEXT,
  courseId TEXT,
  teacherId TEXT,
  classroomId TEXT,
  groupId TEXT,
  notes TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Student logs (discipline, incidents, etc.)
CREATE TABLE IF NOT EXISTS student_logs (
  id TEXT PRIMARY KEY,
  studentId TEXT NOT NULL,
  organizationId TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'incident',
  category TEXT DEFAULT 'general',
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  actionTaken TEXT,
  followUpRequired INTEGER DEFAULT 0,
  followUpDate TEXT,
  followUpNotes TEXT,
  reportedByName TEXT,
  witnessNames TEXT,
  location TEXT,
  parentNotified INTEGER DEFAULT 0,
  parentNotifiedAt TEXT,
  parentNotifiedBy TEXT,
  resolution TEXT,
  resolvedAt TEXT,
  resolvedBy TEXT,
  attachments TEXT,
  createdBy TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Contacts table
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

-- Conversations table
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

-- Messages table
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

-- Templates table
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  organizationId TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL',
  subject TEXT,
  content TEXT NOT NULL,
  variables TEXT,
  isSystem INTEGER DEFAULT 0,
  triggerAction TEXT,
  signature TEXT DEFAULT '{organisation}',
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge base table
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

-- AI Configuration
CREATE TABLE IF NOT EXISTS ai_config (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL UNIQUE,
  systemInstructions TEXT,
  responseTone TEXT DEFAULT 'professional',
  language TEXT DEFAULT 'auto',
  knowledgeBaseEnabled INTEGER DEFAULT 1,
  autoReplyEnabled INTEGER DEFAULT 1,
  autoReplyCategories TEXT DEFAULT '["GENERAL", "SCHEDULE", "PRICING", "ENROLLMENT"]',
  maxResponseLength INTEGER DEFAULT 500,
  includeSignature INTEGER DEFAULT 1,
  signatureText TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- AI Automation Configuration
CREATE TABLE IF NOT EXISTS ai_automation_config (
  id TEXT PRIMARY KEY,
  organizationId TEXT,
  isEnabled INTEGER DEFAULT 1,
  puerApiKey TEXT,
  responseTemplate TEXT,
  maxResponseLength INTEGER DEFAULT 500,
  includeKnowledgeBase INTEGER DEFAULT 1,
  autoRespondToAll INTEGER DEFAULT 0,
  responseDelay INTEGER DEFAULT 0,
  selectedModel TEXT DEFAULT 'default',
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Absence Notification Configuration
CREATE TABLE IF NOT EXISTS absence_notification_config (
  id TEXT PRIMARY KEY,
  organizationId TEXT,
  isEnabled INTEGER DEFAULT 1,
  templateName TEXT,
  sendToParents INTEGER DEFAULT 1,
  primaryPhoneNumberId TEXT,
  notifyDelay INTEGER DEFAULT 5,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Absence Notifications Log
CREATE TABLE IF NOT EXISTS absence_notifications (
  id TEXT PRIMARY KEY,
  organizationId TEXT,
  studentId TEXT,
  parentPhone TEXT,
  templateName TEXT,
  messageId TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Accounts
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  phoneNumber TEXT NOT NULL,
  accountName TEXT,
  connectionStatus TEXT DEFAULT 'disconnected',
  sessionToken TEXT,
  sessionData TEXT,
  deviceId TEXT,
  lastConnected TEXT,
  isActive INTEGER DEFAULT 1,
  isDefault INTEGER DEFAULT 0,
  qrCode TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Meta Numbers
CREATE TABLE IF NOT EXISTS whatsapp_meta_numbers (
  id TEXT PRIMARY KEY,
  organizationId TEXT,
  phoneNumberId TEXT,
  displayPhoneNumber TEXT,
  accessToken TEXT,
  isActive INTEGER DEFAULT 1,
  isPrimary INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- WhatsApp Notifications
CREATE TABLE IF NOT EXISTS whatsapp_notifications (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  studentId TEXT,
  attendanceId TEXT,
  phoneNumber TEXT NOT NULL,
  parentName TEXT,
  message TEXT NOT NULL,
  messageType TEXT NOT NULL DEFAULT 'ABSENCE',
  status TEXT DEFAULT 'sent',
  sentById TEXT,
  sentAt TEXT DEFAULT CURRENT_TIMESTAMP,
  deliveredAt TEXT,
  errorMessage TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Baileys Sessions (for WhatsApp multi-device)
CREATE TABLE IF NOT EXISTS baileys_sessions (
  id TEXT PRIMARY KEY,
  phoneNumber TEXT UNIQUE NOT NULL,
  sessionData TEXT NOT NULL,
  qrCode TEXT,
  status TEXT DEFAULT 'disconnected',
  lastActivity TEXT DEFAULT CURRENT_TIMESTAMP,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Webhook Configuration
CREATE TABLE IF NOT EXISTS webhook_config (
  id TEXT PRIMARY KEY,
  organizationId TEXT,
  webhookUrl TEXT,
  verifyToken TEXT,
  subscribedEvents TEXT,
  isConfigured INTEGER DEFAULT 0,
  lastUpdated TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Email Configuration
CREATE TABLE IF NOT EXISTS email_config (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'brevo',
  smtpHost TEXT,
  smtpPort INTEGER DEFAULT 587,
  smtpUser TEXT,
  smtpPassword TEXT,
  imapHost TEXT,
  imapPort INTEGER DEFAULT 993,
  imapUser TEXT,
  imapPassword TEXT,
  brevoApiKey TEXT,
  mailchimpApiKey TEXT,
  gmailClientId TEXT,
  gmailClientSecret TEXT,
  gmailRefreshToken TEXT,
  gmailAccessToken TEXT,
  fromEmail TEXT NOT NULL,
  fromName TEXT,
  isDefault INTEGER DEFAULT 0,
  isActive INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Email Folders
CREATE TABLE IF NOT EXISTS email_folders (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  userId TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'inbox',
  parentId TEXT,
  orderIndex INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Email Messages
CREATE TABLE IF NOT EXISTS email_messages_new (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  configId TEXT,
  folderId TEXT,
  userId TEXT,
  toEmail TEXT,
  toName TEXT,
  cc TEXT,
  bcc TEXT,
  fromEmail TEXT,
  fromName TEXT,
  replyTo TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  htmlBody TEXT,
  attachments TEXT,
  direction TEXT DEFAULT 'outbound',
  status TEXT DEFAULT 'pending',
  isRead INTEGER DEFAULT 0,
  isStarred INTEGER DEFAULT 0,
  isImportant INTEGER DEFAULT 0,
  messageid TEXT,
  inReplyTo TEXT,
  sentAt TEXT,
  receivedAt TEXT,
  error TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignedToId TEXT,
  assignedToType TEXT DEFAULT 'USER',
  createdBy TEXT NOT NULL,
  dueDate TEXT NOT NULL,
  startDate TEXT DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'PENDING',
  priority TEXT DEFAULT 'MEDIUM',
  progress INTEGER DEFAULT 0,
  attachments TEXT,
  completedAt TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Activities (audit log)
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

-- Backup History
CREATE TABLE IF NOT EXISTS backup_history (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  type TEXT DEFAULT 'full',
  size INTEGER DEFAULT 0,
  recordCount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'completed',
  downloadUrl TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Promotion History
CREATE TABLE IF NOT EXISTS promotion_history (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  studentId TEXT NOT NULL,
  fromYear INTEGER,
  toYear INTEGER,
  promotedById TEXT,
  notes TEXT,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Graduated Students Archive
CREATE TABLE IF NOT EXISTS graduated_students_archive (
  id TEXT PRIMARY KEY,
  organizationId TEXT NOT NULL,
  studentId TEXT NOT NULL,
  studentName TEXT NOT NULL,
  groupName TEXT,
  academicYears TEXT,
  coursesCompleted TEXT,
  attendanceSummary TEXT,
  graduationDate TEXT NOT NULL,
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_organizationId ON users(organizationId);
CREATE INDEX IF NOT EXISTS idx_students_organizationId ON students(organizationId);
CREATE INDEX IF NOT EXISTS idx_students_groupId ON students(groupId);
CREATE INDEX IF NOT EXISTS idx_groups_organizationId ON groups(organizationId);
CREATE INDEX IF NOT EXISTS idx_courses_organizationId ON courses(organizationId);
CREATE INDEX IF NOT EXISTS idx_attendance_studentId ON attendance(studentId);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON messages(conversationId);
CREATE INDEX IF NOT EXISTS idx_conversations_organizationId ON conversations(organizationId);
CREATE INDEX IF NOT EXISTS idx_contacts_organizationId ON contacts(organizationId);

-- Branding Settings (for landing page customization)
CREATE TABLE IF NOT EXISTS branding_settings (
  id TEXT PRIMARY KEY,
  organizationId TEXT UNIQUE NOT NULL,
  logo TEXT,
  logoWidth INTEGER DEFAULT 40,
  appName TEXT DEFAULT 'EduSaaS',
  tagline TEXT DEFAULT 'Education Management Platform',
  primaryColor TEXT DEFAULT '#10b981',
  secondaryColor TEXT DEFAULT '#6366f1',
  accentColor TEXT DEFAULT '#f59e0b',
  heroTitle TEXT DEFAULT 'Transform Your Educational Institution',
  heroSubtitle TEXT DEFAULT 'Complete management solution for schools, training centers, and educational organizations',
  heroButtonText TEXT DEFAULT 'Get Started',
  heroButtonLink TEXT DEFAULT '/login',
  heroBackgroundImage TEXT,
  heroBackgroundGradient TEXT DEFAULT 'from-green-600 to-emerald-700',
  showFeatures INTEGER DEFAULT 1,
  feature1Title TEXT DEFAULT 'Student Management',
  feature1Description TEXT DEFAULT 'Complete student lifecycle management from enrollment to graduation',
  feature1Icon TEXT DEFAULT 'GraduationCap',
  feature2Title TEXT DEFAULT 'Communication Hub',
  feature2Description TEXT DEFAULT 'Integrated WhatsApp and email communication tools',
  feature2Icon TEXT DEFAULT 'MessageSquare',
  feature3Title TEXT DEFAULT 'Analytics & Reports',
  feature3Description TEXT DEFAULT 'Comprehensive reporting and analytics dashboard',
  feature3Icon TEXT DEFAULT 'BarChart3',
  footerText TEXT DEFAULT '© 2026 EduSaaS. All rights reserved.',
  facebookUrl TEXT,
  twitterUrl TEXT,
  linkedinUrl TEXT,
  instagramUrl TEXT,
  contactEmail TEXT,
  contactPhone TEXT,
  customCss TEXT,
  -- Pricing Section
  showPricing INTEGER DEFAULT 1,
  pricingTitle TEXT DEFAULT 'Transparent Pricing',
  pricingSubtitle TEXT DEFAULT 'Choose the plan that fits your institution',
  plan1Name TEXT DEFAULT 'Starter',
  plan1Price TEXT DEFAULT '299',
  plan1Period TEXT DEFAULT '/month',
  plan1Description TEXT DEFAULT 'Ideal for small academies',
  plan1Features TEXT DEFAULT '100 students|3 users|500 AI messages/day|10 templates|Email support',
  plan1Highlighted INTEGER DEFAULT 0,
  plan1ButtonText TEXT DEFAULT 'Get Started',
  plan2Name TEXT DEFAULT 'Professional',
  plan2Price TEXT DEFAULT '799',
  plan2Period TEXT DEFAULT '/month',
  plan2Description TEXT DEFAULT 'For growing schools',
  plan2Features TEXT DEFAULT '500 students|10 users|2000 AI messages/day|50 templates|Priority support|Advanced reports',
  plan2Highlighted INTEGER DEFAULT 1,
  plan2ButtonText TEXT DEFAULT 'Get Started',
  plan3Name TEXT DEFAULT 'Enterprise',
  plan3Price TEXT DEFAULT '1999',
  plan3Period TEXT DEFAULT '/month',
  plan3Description TEXT DEFAULT 'For large institutions',
  plan3Features TEXT DEFAULT 'Unlimited students|Unlimited users|10000 AI messages/day|Unlimited templates|Dedicated support|API access|Training included',
  plan3Highlighted INTEGER DEFAULT 0,
  plan3ButtonText TEXT DEFAULT 'Contact Sales',
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE
);
