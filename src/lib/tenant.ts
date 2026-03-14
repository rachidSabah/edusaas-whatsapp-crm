// Tenant context and isolation utilities - Using raw SQL for libsql/Turso
import db from './db';
import { getCurrentUser } from './auth';
import { PLAN_FEATURES } from './constants';

export interface TenantContext {
  organizationId: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    locale: string;
    timezone: string;
    isActive: boolean;
    whatsappConnected: boolean;
    aiEnabled: boolean;
    aiDailyLimit: number;
    aiDailyUsed: number;
  };
  features: typeof PLAN_FEATURES.starter;
}

/**
 * Get tenant context for current user
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) {
    return null;
  }

  return getTenantContextById(user.organizationId);
}

/**
 * Get tenant context by organization ID
 */
export async function getTenantContextById(organizationId: string): Promise<TenantContext | null> {
  const result = await db.execute({
    sql: `SELECT id, name, slug, plan, locale, timezone, isActive, whatsappConnected, aiEnabled, aiDailyLimit, aiDailyUsed 
          FROM organizations WHERE id = ?`,
    args: [organizationId],
  });

  const organization = result.rows[0];
  if (!organization) {
    return null;
  }

  const features = PLAN_FEATURES[(organization.plan as string) as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.starter;

  return {
    organizationId: organization.id as string,
    organization: {
      id: organization.id as string,
      name: organization.name as string,
      slug: organization.slug as string,
      plan: organization.plan as string,
      locale: (organization.locale as string) || 'fr',
      timezone: (organization.timezone as string) || 'Africa/Casablanca',
      isActive: organization.isActive === 1,
      whatsappConnected: organization.whatsappConnected === 1,
      aiEnabled: organization.aiEnabled === 1,
      aiDailyLimit: (organization.aiDailyLimit as number) || features.aiDailyLimit,
      aiDailyUsed: (organization.aiDailyUsed as number) || 0,
    },
    features,
  };
}

/**
 * Verify tenant has access to a resource
 */
export async function verifyTenantAccess(organizationId: string, resourceOrgId: string): Promise<boolean> {
  const user = await getCurrentUser();
  
  // Super admin can access everything
  if (user?.role === 'SUPER_ADMIN') {
    return true;
  }

  // User must belong to the same organization as the resource
  return organizationId === resourceOrgId;
}

/**
 * Create a scoped query filter for tenant isolation
 */
export function tenantFilter(organizationId: string): { organizationId: string } {
  return { organizationId };
}

/**
 * Check if tenant has reached AI limit
 */
export async function checkAiLimit(organizationId: string): Promise<{ allowed: boolean; remaining: number }> {
  const context = await getTenantContextById(organizationId);
  
  if (!context) {
    return { allowed: false, remaining: 0 };
  }

  const { organization, features } = context;
  const limit = organization.aiDailyLimit || features.aiDailyLimit;
  const used = organization.aiDailyUsed;

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
  };
}

/**
 * Increment AI usage counter
 */
export async function incrementAiUsage(organizationId: string): Promise<void> {
  await db.execute({
    sql: `UPDATE organizations SET aiDailyUsed = aiDailyUsed + 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [organizationId],
  });
}

/**
 * Reset daily AI usage (should be called by cron job)
 */
export async function resetDailyAiUsage(): Promise<void> {
  await db.execute({
    sql: `UPDATE organizations SET aiDailyUsed = 0`,
    args: [],
  });
}

/**
 * Check if tenant can add more students
 */
export async function canAddStudent(organizationId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const context = await getTenantContextById(organizationId);
  
  if (!context) {
    return { allowed: false, current: 0, limit: 0 };
  }

  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM students WHERE organizationId = ?`,
    args: [organizationId],
  });

  const count = (result.rows[0]?.count as number) || 0;
  const limit = context.features.maxStudents;

  return {
    allowed: limit === -1 || count < limit,
    current: count,
    limit,
  };
}

/**
 * Check if tenant can add more users
 */
export async function canAddUser(organizationId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const context = await getTenantContextById(organizationId);
  
  if (!context) {
    return { allowed: false, current: 0, limit: 0 };
  }

  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM users WHERE organizationId = ?`,
    args: [organizationId],
  });

  const count = (result.rows[0]?.count as number) || 0;
  const limit = context.features.maxUsers;

  return {
    allowed: limit === -1 || count < limit,
    current: count,
    limit,
  };
}

/**
 * Log activity for audit trail
 */
export async function logActivity(data: {
  organizationId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
}): Promise<void> {
  const id = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.execute({
    sql: `INSERT INTO activities (id, organizationId, userId, action, entityType, entityId, details) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.organizationId,
      data.userId || null,
      data.action,
      data.entityType,
      data.entityId || null,
      data.details ? JSON.stringify(data.details) : null,
    ],
  });
}

/**
 * Get organization statistics
 */
export async function getOrganizationStats(organizationId: string): Promise<{
  totalStudents: number;
  activeStudents: number;
  totalContacts: number;
  totalConversations: number;
  activeConversations: number;
  todayAttendance: { present: number; absent: number; late: number };
  aiUsage: { used: number; limit: number };
}> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  const [
    totalStudentsResult,
    activeStudentsResult,
    totalContactsResult,
    totalConversationsResult,
    activeConversationsResult,
    todayAttendanceResult,
    organizationResult,
  ] = await Promise.all([
    db.execute({
      sql: `SELECT COUNT(*) as count FROM students WHERE organizationId = ?`,
      args: [organizationId],
    }),
    db.execute({
      sql: `SELECT COUNT(*) as count FROM students WHERE organizationId = ? AND status = 'ACTIVE'`,
      args: [organizationId],
    }),
    db.execute({
      sql: `SELECT COUNT(*) as count FROM contacts WHERE organizationId = ?`,
      args: [organizationId],
    }),
    db.execute({
      sql: `SELECT COUNT(*) as count FROM conversations WHERE organizationId = ?`,
      args: [organizationId],
    }),
    db.execute({
      sql: `SELECT COUNT(*) as count FROM conversations WHERE organizationId = ? AND status = 'active'`,
      args: [organizationId],
    }),
    db.execute({
      sql: `SELECT status, COUNT(*) as count FROM attendance WHERE organizationId = ? AND date = ? GROUP BY status`,
      args: [organizationId, today],
    }),
    db.execute({
      sql: `SELECT aiDailyUsed, aiDailyLimit, plan FROM organizations WHERE id = ?`,
      args: [organizationId],
    }),
  ]);

  const attendanceStats = { present: 0, absent: 0, late: 0 };
  todayAttendanceResult.rows.forEach(item => {
    const status = item.status as string;
    const count = item.count as number;
    if (status === 'PRESENT') attendanceStats.present = count;
    else if (status === 'ABSENT') attendanceStats.absent = count;
    else if (status === 'LATE') attendanceStats.late = count;
  });

  const org = organizationResult.rows[0];
  const features = PLAN_FEATURES[(org?.plan as string) as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.starter;

  return {
    totalStudents: (totalStudentsResult.rows[0]?.count as number) || 0,
    activeStudents: (activeStudentsResult.rows[0]?.count as number) || 0,
    totalContacts: (totalContactsResult.rows[0]?.count as number) || 0,
    totalConversations: (totalConversationsResult.rows[0]?.count as number) || 0,
    activeConversations: (activeConversationsResult.rows[0]?.count as number) || 0,
    todayAttendance: attendanceStats,
    aiUsage: {
      used: (org?.aiDailyUsed as number) || 0,
      limit: (org?.aiDailyLimit as number) || features.aiDailyLimit,
    },
  };
}
