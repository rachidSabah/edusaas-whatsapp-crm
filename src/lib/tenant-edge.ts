// Tenant context and isolation utilities - Edge Runtime compatible for Cloudflare
import { getDbContext } from './db-context';
import { getCurrentUser } from './auth-edge';
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
  try {
    const db = getDbContext();
    
    const orgs = await db.query<{
      id: string;
      name: string;
      slug: string;
      plan: string;
      locale: string | null;
      timezone: string | null;
      isActive: number;
      whatsappConnected: number;
      aiEnabled: number;
      aiDailyLimit: number;
      aiDailyUsed: number;
    }>(
      `SELECT id, name, slug, plan, locale, timezone, isActive, whatsappConnected, aiEnabled, aiDailyLimit, aiDailyUsed 
       FROM organizations WHERE id = ?`,
      [organizationId]
    );

    const organization = orgs[0];
    if (!organization) {
      return null;
    }

    const features = PLAN_FEATURES[organization.plan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.starter;

    return {
      organizationId: organization.id,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
        locale: organization.locale || 'fr',
        timezone: organization.timezone || 'Africa/Casablanca',
        isActive: organization.isActive === 1,
        whatsappConnected: organization.whatsappConnected === 1,
        aiEnabled: organization.aiEnabled === 1,
        aiDailyLimit: organization.aiDailyLimit || features.aiDailyLimit,
        aiDailyUsed: organization.aiDailyUsed || 0,
      },
      features,
    };
  } catch (error) {
    console.error('getTenantContextById error:', error);
    return null;
  }
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
  const db = getDbContext();
  await db.execute(
    `UPDATE organizations SET aiDailyUsed = aiDailyUsed + 1, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    [organizationId]
  );
}

/**
 * Reset daily AI usage (should be called by cron job)
 */
export async function resetDailyAiUsage(): Promise<void> {
  const db = getDbContext();
  await db.execute(`UPDATE organizations SET aiDailyUsed = 0`, []);
}

/**
 * Check if tenant can add more students
 */
export async function canAddStudent(organizationId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const context = await getTenantContextById(organizationId);
  
  if (!context) {
    return { allowed: false, current: 0, limit: 0 };
  }

  const db = getDbContext();
  const result = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM students WHERE organizationId = ?`,
    [organizationId]
  );

  const count = result[0]?.count || 0;
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

  const db = getDbContext();
  const result = await db.query<{ count: number }>(
    `SELECT COUNT(*) as count FROM users WHERE organizationId = ?`,
    [organizationId]
  );

  const count = result[0]?.count || 0;
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
  const db = getDbContext();
  const id = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.execute(
    `INSERT INTO activities (id, organizationId, userId, action, entityType, entityId, details) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.organizationId,
      data.userId || null,
      data.action,
      data.entityType,
      data.entityId || null,
      data.details ? JSON.stringify(data.details) : null,
    ]
  );
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
  const db = getDbContext();
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
    db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM students WHERE organizationId = ?`,
      [organizationId]
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM students WHERE organizationId = ? AND status = 'ACTIVE'`,
      [organizationId]
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM contacts WHERE organizationId = ?`,
      [organizationId]
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM conversations WHERE organizationId = ?`,
      [organizationId]
    ),
    db.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM conversations WHERE organizationId = ? AND status = 'active'`,
      [organizationId]
    ),
    db.query<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM attendance WHERE organizationId = ? AND date = ? GROUP BY status`,
      [organizationId, today]
    ),
    db.query<{ aiDailyUsed: number; aiDailyLimit: number; plan: string }>(
      `SELECT aiDailyUsed, aiDailyLimit, plan FROM organizations WHERE id = ?`,
      [organizationId]
    ),
  ]);

  const attendanceStats = { present: 0, absent: 0, late: 0 };
  todayAttendanceResult.forEach(item => {
    if (item.status === 'PRESENT') attendanceStats.present = item.count;
    else if (item.status === 'ABSENT') attendanceStats.absent = item.count;
    else if (item.status === 'LATE') attendanceStats.late = item.count;
  });

  const org = organizationResult[0];
  const features = PLAN_FEATURES[org?.plan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.starter;

  return {
    totalStudents: totalStudentsResult[0]?.count || 0,
    activeStudents: activeStudentsResult[0]?.count || 0,
    totalContacts: totalContactsResult[0]?.count || 0,
    totalConversations: totalConversationsResult[0]?.count || 0,
    activeConversations: activeConversationsResult[0]?.count || 0,
    todayAttendance: attendanceStats,
    aiUsage: {
      used: org?.aiDailyUsed || 0,
      limit: org?.aiDailyLimit || features.aiDailyLimit,
    },
  };
}
