export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

// Get analytics for organization
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      // Return empty analytics for SUPER_ADMIN without organization
      return NextResponse.json({
        analytics: {
          overview: {
            totalStudents: 0,
            activeStudents: 0,
            totalContacts: 0,
            totalConversations: 0,
            activeConversations: 0,
            todayAttendance: { present: 0, absent: 0, late: 0 },
            aiUsage: { used: 0, limit: 1000 },
          },
          conversations: {
            total: 0,
            byCategory: {},
            byStatus: {},
          },
          messages: {
            aiVsHuman: { ai: 0, human: 0 },
            daily: [],
          },
          attendance: {
            byStatus: {},
          },
          contacts: {
            byTag: [],
          },
          period: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date(),
            days: 7,
          },
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (period) {
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }
    const startDateStr = startDate.toISOString();

    // Get basic stats
    const orgStats = await db.query<{ totalStudents: number; activeStudents: number; totalContacts: number; totalConversations: number; activeConversations: number }>(
      `SELECT 
        (SELECT COUNT(*) FROM students WHERE organizationId = ?) as totalStudents,
        (SELECT COUNT(*) FROM students WHERE organizationId = ? AND status = 'ACTIVE') as activeStudents,
        (SELECT COUNT(*) FROM contacts WHERE organizationId = ?) as totalContacts,
        (SELECT COUNT(*) FROM conversations WHERE organizationId = ?) as totalConversations,
        (SELECT COUNT(*) FROM conversations WHERE organizationId = ? AND status = 'active') as activeConversations`,
      [user.organizationId, user.organizationId, user.organizationId, user.organizationId, user.organizationId]
    );

    // Get attendance stats
    const today = new Date().toISOString().split('T')[0];
    const attendanceStats = await db.query<{ status: string; count: number }>(
      `SELECT status, COUNT(*) as count FROM attendance 
       WHERE organizationId = ? AND date = ? 
       GROUP BY status`,
      [user.organizationId, today]
    );

    const todayAttendance = {
      present: attendanceStats.find(a => a.status === 'PRESENT')?.count || 0,
      absent: attendanceStats.find(a => a.status === 'ABSENT')?.count || 0,
      late: attendanceStats.find(a => a.status === 'LATE')?.count || 0,
    };

    // Get AI usage
    const aiUsage = await db.query<{ dailyLimit: number; dailyUsed: number }>(
      `SELECT aiDailyLimit as dailyLimit, aiDailyUsed as dailyUsed FROM organizations WHERE id = ?`,
      [user.organizationId]
    );

    // Get conversation analytics
    const [
      totalConversationsResult,
      conversationsByCategoryResult,
      conversationsByStatusResult,
      attendanceByStatusResult,
      contactsByTagResult,
    ] = await Promise.all([
      db.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM conversations WHERE organizationId = ? AND createdAt >= ?`,
        [user.organizationId, startDateStr]
      ),
      db.query<{ category: string; count: number }>(
        `SELECT category, COUNT(*) as count FROM conversations WHERE organizationId = ? AND createdAt >= ? AND category IS NOT NULL GROUP BY category`,
        [user.organizationId, startDateStr]
      ),
      db.query<{ status: string; count: number }>(
        `SELECT status, COUNT(*) as count FROM conversations WHERE organizationId = ? AND createdAt >= ? GROUP BY status`,
        [user.organizationId, startDateStr]
      ),
      db.query<{ status: string; count: number }>(
        `SELECT status, COUNT(*) as count FROM attendance WHERE organizationId = ? AND date >= ? GROUP BY status`,
        [user.organizationId, startDateStr]
      ),
      db.query<{ tag: string; count: number }>(
        `SELECT tag, COUNT(*) as count FROM (SELECT json_each.value as tag FROM contacts, json_each(tags) WHERE contacts.organizationId = ?) GROUP BY tag`,
        [user.organizationId]
      ),
    ]);

    // Format analytics data
    const stats = orgStats[0] || { totalStudents: 0, activeStudents: 0, totalContacts: 0, totalConversations: 0, activeConversations: 0 };
    const ai = aiUsage[0] || { dailyLimit: 1000, dailyUsed: 0 };

    const analytics = {
      overview: {
        totalStudents: stats.totalStudents,
        activeStudents: stats.activeStudents,
        totalContacts: stats.totalContacts,
        totalConversations: stats.totalConversations,
        activeConversations: stats.activeConversations,
        todayAttendance,
        aiUsage: {
          used: ai.dailyUsed,
          limit: ai.dailyLimit,
        },
      },
      conversations: {
        total: totalConversationsResult[0]?.count || 0,
        byCategory: conversationsByCategoryResult.reduce((acc, item) => {
          acc[item.category || 'unknown'] = item.count;
          return acc;
        }, {} as Record<string, number>),
        byStatus: conversationsByStatusResult.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {} as Record<string, number>),
      },
      messages: {
        aiVsHuman: { ai: 0, human: 0 },
        daily: [],
      },
      attendance: {
        byStatus: attendanceByStatusResult.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {} as Record<string, number>),
      },
      contacts: {
        byTag: contactsByTagResult.map(item => ({ tag: item.tag, count: item.count })),
      },
      period: {
        start: startDate,
        end: now,
        days: period === '90d' ? 90 : period === '30d' ? 30 : 7,
      },
    };

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Get analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
