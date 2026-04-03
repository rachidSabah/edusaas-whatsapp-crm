-- D1 Database Seed Data
-- Run this file after d1-schema.sql to add initial data

-- Create default organization
INSERT OR IGNORE INTO organizations (id, name, slug, email, plan, isActive, aiEnabled, aiDailyLimit, aiDailyUsed, whatsappConnected, createdAt, updatedAt)
VALUES (
  'org_1773318948848_gbk3n5e8d',
  'EduSaaS Admin Organization',
  'edusaas-admin',
  'admin@edusaas.ma',
  'enterprise',
  1,
  1,
  1000,
  0,
  0,
  datetime('now'),
  datetime('now')
);

-- Create admin user (password: Santafee@@@@@1972)
-- The password hash is sha256$ + SHA256(password + salt)
INSERT OR IGNORE INTO users (id, email, password, name, role, organizationId, isActive, createdAt, updatedAt)
VALUES (
  'admin_1775209512416',
  'admin@edusaas.ma',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.pMV.V8hP0P0P0O',
  'Super Admin',
  'SUPER_ADMIN',
  'org_1773318948848_gbk3n5e8d',
  1,
  datetime('now'),
  datetime('now')
);

-- Create sample templates
INSERT OR IGNORE INTO templates (id, organizationId, name, category, content, isActive, isSystem, createdAt)
VALUES 
  ('tpl_absence_1', 'org_1773318948848_gbk3n5e8d', 'Notification d''absence', 'ABSENCE', 'Cher parent, nous vous informons que votre enfant {studentName} était absent le {date}.', 1, 1, datetime('now')),
  ('tpl_schedule_1', 'org_1773318948848_gbk3n5e8d', 'Changement d''horaire', 'SCHEDULE', 'Cher parent, nous vous informons d''un changement d''horaire pour le cours de {courseName}.', 1, 1, datetime('now'));

-- Create AI config for organization
INSERT OR IGNORE INTO ai_config (id, organizationId, systemInstructions, responseTone, language, knowledgeBaseEnabled, autoReplyEnabled, createdAt, updatedAt)
VALUES (
  'ai_config_1',
  'org_1773318948848_gbk3n5e8d',
  'You are a helpful assistant for an educational institution. Help answer questions about courses, schedules, and enrollment.',
  'professional',
  'fr',
  1,
  1,
  datetime('now'),
  datetime('now')
);
