// Application Constants for Multi-Tenant WhatsApp CRM SaaS

// User Roles
export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ORG_ADMIN: 'ORG_ADMIN',
  SCHOOL_MANAGER: 'SCHOOL_MANAGER',
  TEACHER: 'TEACHER',
  CHAT_OPERATOR: 'CHAT_OPERATOR',
  USER: 'USER',
} as const;

export const ROLE_LABELS: Record<string, { en: string; fr: string }> = {
  SUPER_ADMIN: { en: 'Super Admin', fr: 'Super Admin' },
  ORG_ADMIN: { en: 'Organization Admin', fr: 'Administrateur' },
  SCHOOL_MANAGER: { en: 'School Manager', fr: 'Gestionnaire École' },
  TEACHER: { en: 'Teacher', fr: 'Enseignant' },
  CHAT_OPERATOR: { en: 'Chat Operator', fr: 'Opérateur Chat' },
  USER: { en: 'User', fr: 'Utilisateur' },
};

// Role permissions
export const ROLE_PERMISSIONS = {
  SUPER_ADMIN: {
    canManageAllOrganizations: true,
    canManageUsers: true,
    canManageSubscriptions: true,
    canViewAnalytics: true,
    canManageSettings: true,
    canAccessAdminDashboard: true,
    canManageTeachers: true,
    canManageAssignments: true,
  },
  ORG_ADMIN: {
    canManageOrganization: true,
    canManageUsers: true,
    canManageStudents: true,
    canManageAttendance: true,
    canManageTemplates: true,
    canManageKnowledgeBase: true,
    canViewAnalytics: true,
    canManageWhatsApp: true,
    canAccessAdminDashboard: true,
    canManageTeachers: true,
  },
  SCHOOL_MANAGER: {
    canManageOrganization: true,
    canManageUsers: true,
    canManageTeachers: true,
    canManageAssignments: true,
    canViewAnalytics: true,
    canAccessAdminDashboard: true,
    canAssignTasks: true,
    canTrackProgress: true,
  },
  TEACHER: {
    canViewStudents: true,
    canManageAttendance: true,
    canViewSchedule: true,
    canViewAssignedTasks: true,
    canUpdateTaskProgress: true,
  },
  CHAT_OPERATOR: {
    canViewConversations: true,
    canReplyToConversations: true,
    canViewContacts: true,
  },
  USER: {
    canViewAssignedTasks: true,
    canUpdateTaskProgress: true,
  canChatWithAdmin: true,
  },
};

// Task Status
export const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
} as const;

export const TASK_STATUS_LABELS: Record<string, { en: string; fr: string; color: string }> = {
  PENDING: { en: 'Pending', fr: 'En attente', color: 'yellow' },
  IN_PROGRESS: { en: 'In Progress', fr: 'En cours', color: 'blue' },
  COMPLETED: { en: 'Completed', fr: 'Terminé', color: 'green' },
  OVERDUE: { en: 'Overdue', fr: 'En retard', color: 'red' },
};

// User Status
export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export const USER_STATUS_LABELS: Record<string, { en: string; fr: string }> = {
  ACTIVE: { en: 'Active', fr: 'Actif' },
  INACTIVE: { en: 'Inactive', fr: 'Inactif' },
  SUSPENDED: { en: 'Suspended', fr: 'Suspendu' },
};

// Organization Plans
export const PLANS = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

export const PLAN_FEATURES = {
  starter: {
    name: { en: 'Starter', fr: 'Starter' },
    maxStudents: 100,
    maxUsers: 3,
    aiDailyLimit: 500,
    templates: 10,
    knowledgeBaseEntries: 50,
    price: 299, // MAD
  },
  professional: {
    name: { en: 'Professional', fr: 'Professionnel' },
    maxStudents: 500,
    maxUsers: 10,
    aiDailyLimit: 2000,
    templates: 50,
    knowledgeBaseEntries: 200,
    price: 799,
  },
  enterprise: {
    name: { en: 'Enterprise', fr: 'Entreprise' },
    maxStudents: -1, // Unlimited
    maxUsers: -1,
    aiDailyLimit: 10000,
    templates: -1,
    knowledgeBaseEntries: -1,
    price: 1999,
  },
};

// Student Status
export const STUDENT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  GRADUATED: 'GRADUATED',
  WITHDRAWN: 'WITHDRAWN',
  ON_LEAVE: 'ON_LEAVE',
} as const;

export const STUDENT_STATUS_LABELS: Record<string, { en: string; fr: string }> = {
  ACTIVE: { en: 'Active', fr: 'Actif' },
  INACTIVE: { en: 'Inactive', fr: 'Inactif' },
  GRADUATED: { en: 'Graduated', fr: 'Diplômé' },
  WITHDRAWN: { en: 'Withdrawn', fr: 'Retiré' },
  ON_LEAVE: { en: 'On Leave', fr: 'En congé' },
};

// Attendance Status
export const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  EXCUSED: 'EXCUSED',
} as const;

export const ATTENDANCE_STATUS_LABELS: Record<string, { en: string; fr: string; color: string }> = {
  PRESENT: { en: 'Present', fr: 'Présent', color: 'green' },
  ABSENT: { en: 'Absent', fr: 'Absent', color: 'red' },
  LATE: { en: 'Late', fr: 'En retard', color: 'yellow' },
  EXCUSED: { en: 'Excused', fr: 'Excusé', color: 'blue' },
};

// Contact Tags
export const CONTACT_TAGS = {
  PROSPECT: 'PROSPECT',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
  GRADUATE: 'GRADUATE',
  LEAD: 'LEAD',
  VIP: 'VIP',
} as const;

export const CONTACT_TAG_LABELS: Record<string, { en: string; fr: string }> = {
  PROSPECT: { en: 'Prospect', fr: 'Prospect' },
  STUDENT: { en: 'Student', fr: 'Étudiant' },
  PARENT: { en: 'Parent', fr: 'Parent' },
  GRADUATE: { en: 'Graduate', fr: 'Diplômé' },
  LEAD: { en: 'Lead', fr: 'Lead' },
  VIP: { en: 'VIP', fr: 'VIP' },
};

// Conversation Status
export const CONVERSATION_STATUS = {
  ACTIVE: 'active',
  RESOLVED: 'resolved',
  PENDING: 'pending',
  TRANSFERRED: 'transferred',
} as const;

// Message Categories
export const MESSAGE_CATEGORIES = {
  ENROLLMENT: 'enrollment',
  STUDENT_REQUEST: 'student_request',
  GENERAL: 'general',
  SUPPORT: 'support',
  PARENT_INQUIRY: 'parent_inquiry',
} as const;

export const MESSAGE_CATEGORY_LABELS: Record<string, { en: string; fr: string }> = {
  enrollment: { en: 'Enrollment Inquiry', fr: "Demande d'inscription" },
  student_request: { en: 'Student Request', fr: "Demande d'étudiant" },
  general: { en: 'General', fr: 'Général' },
  support: { en: 'Support', fr: 'Support' },
  parent_inquiry: { en: 'Parent Inquiry', fr: 'Demande de parent' },
};

// Template Categories
export const TEMPLATE_CATEGORIES = {
  ABSENCE_NOTIFICATION: 'ABSENCE_NOTIFICATION',
  LATE_NOTIFICATION: 'LATE_NOTIFICATION',
  PAYMENT_REMINDER: 'PAYMENT_REMINDER',
  ADMIN_COMMUNICATION: 'ADMIN_COMMUNICATION',
  ENROLLMENT_REPLY: 'ENROLLMENT_REPLY',
  WELCOME_MESSAGE: 'WELCOME_MESSAGE',
  SCHEDULE_CHANGE: 'SCHEDULE_CHANGE',
  GENERAL: 'GENERAL',
  MARKETING: 'MARKETING',
} as const;

export const TEMPLATE_CATEGORY_LABELS: Record<string, { en: string; fr: string }> = {
  ABSENCE_NOTIFICATION: { en: 'Absence Notification', fr: "Notification d'absence" },
  LATE_NOTIFICATION: { en: 'Late Notification', fr: 'Notification de retard' },
  PAYMENT_REMINDER: { en: 'Payment Reminder', fr: 'Rappel de paiement' },
  ADMIN_COMMUNICATION: { en: 'Administrative Communication', fr: 'Communication administrative' },
  ENROLLMENT_REPLY: { en: 'Enrollment Reply', fr: "Réponse d'inscription" },
  WELCOME_MESSAGE: { en: 'Welcome Message', fr: 'Message de bienvenue' },
  SCHEDULE_CHANGE: { en: 'Schedule Change', fr: 'Changement horaire' },
  GENERAL: { en: 'General', fr: 'Général' },
  MARKETING: { en: 'Marketing', fr: 'Marketing' },
};

// Template Trigger Actions
export const TEMPLATE_TRIGGER_ACTIONS = {
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  PAYMENT_DELAY: 'PAYMENT_DELAY',
  ADMIN_COMMUNICATION: 'ADMIN_COMMUNICATION',
} as const;

export const TEMPLATE_TRIGGER_LABELS: Record<string, { en: string; fr: string }> = {
  ABSENT: { en: 'Student Absent', fr: 'Étudiant absent' },
  LATE: { en: 'Student Late', fr: 'Étudiant en retard' },
  PAYMENT_DELAY: { en: 'Payment Delay', fr: 'Retard de paiement' },
  ADMIN_COMMUNICATION: { en: 'Administrative Communication', fr: 'Communication administrative' },
};

// Knowledge Base Categories
export const KNOWLEDGE_CATEGORIES = {
  ENROLLMENT: 'ENROLLMENT',
  PRICING: 'PRICING',
  COURSES: 'COURSES',
  SCHEDULE: 'SCHEDULE',
  POLICIES: 'POLICIES',
  GENERAL: 'GENERAL',
  FAQ: 'FAQ',
} as const;

export const KNOWLEDGE_CATEGORY_LABELS: Record<string, { en: string; fr: string }> = {
  ENROLLMENT: { en: 'Enrollment', fr: 'Inscription' },
  PRICING: { en: 'Pricing', fr: 'Tarification' },
  COURSES: { en: 'Courses', fr: 'Cours' },
  SCHEDULE: { en: 'Schedule', fr: 'Horaire' },
  POLICIES: { en: 'Policies', fr: 'Politiques' },
  GENERAL: { en: 'General', fr: 'Général' },
  FAQ: { en: 'FAQ', fr: 'FAQ' },
};

// Template Variables
export const TEMPLATE_VARIABLES = [
  { name: 'StudentName', description: { en: 'Student full name', fr: 'Nom complet de l\'étudiant' } },
  { name: 'FirstName', description: { en: 'Student first name', fr: 'Prénom de l\'étudiant' } },
  { name: 'LastName', description: { en: 'Student last name', fr: 'Nom de famille de l\'étudiant' } },
  { name: 'GroupName', description: { en: 'Group/Class name', fr: 'Nom du groupe/classe' } },
  { name: 'Date', description: { en: 'Current date', fr: 'Date actuelle' } },
  { name: 'Time', description: { en: 'Current time', fr: 'Heure actuelle' } },
  { name: 'ParentName', description: { en: 'Parent name', fr: 'Nom du parent' } },
  { name: 'organisation', description: { en: 'Organization name', fr: 'Nom de l\'organisation' } },
  { name: 'CourseName', description: { en: 'Course/Program name', fr: 'Nom du cours/programme' } },
  { name: 'TeacherName', description: { en: 'Teacher name', fr: 'Nom de l\'enseignant' } },
  { name: 'Month', description: { en: 'Month name', fr: 'Nom du mois' } },
  { name: 'Amount', description: { en: 'Payment amount', fr: 'Montant du paiement' } },
  { name: 'DueDate', description: { en: 'Due date', fr: 'Date d\'échéance' } },
  { name: 'Message', description: { en: 'Custom message', fr: 'Message personnalisé' } },
];

// App Configuration
export const APP_CONFIG = {
  name: 'EduSaaS',
  description: {
    en: 'Multi-Tenant AI WhatsApp CRM for Schools',
    fr: 'CRM WhatsApp IA Multi-Tenant pour Écoles',
  },
  defaultLocale: 'fr',
  supportedLocales: ['fr', 'en'],
  timezone: 'Africa/Casablanca',
  currency: 'MAD',
};

// Pagination
export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
};

// Session Configuration
export const SESSION_CONFIG = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  tokenExpiry: '7d',
  cookieName: 'edusaas_token',
};

// API Configuration
export const API_CONFIG = {
  version: 'v1',
  rateLimitPerMinute: 60,
};
