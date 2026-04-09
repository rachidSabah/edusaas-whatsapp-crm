export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@cloudflare/next-on-pages';
import { tursoQuery, type CloudflareEnv } from '@/lib/turso-http';
import { hashPassword, generateToken, setAuthCookie } from '@/lib/auth-hybrid';

export async function POST(request: NextRequest) {
  try {
    // Get Cloudflare environment
    const ctx = getRequestContext();
    const env = ctx.env as CloudflareEnv;
    const dbUrl = env.TURSO_DATABASE_URL;
    const dbToken = env.TURSO_AUTH_TOKEN;

    if (!dbUrl || !dbToken) {
      console.error('Database configuration missing - TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not set');
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      );
    }

    const body = await request.json() as { email?: string; password?: string; name?: string; organizationName?: string; organizationSlug?: string };
    const { email, password, name, organizationName, organizationSlug } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUsers = await tursoQuery<{ id: string }>(
      dbUrl,
      dbToken,
      `SELECT id FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    let organizationId: string | undefined;

    // Create organization if name provided
    if (organizationName && organizationSlug) {
      const slugOrgs = await tursoQuery<{ id: string }>(
        dbUrl,
        dbToken,
        `SELECT id FROM organizations WHERE slug = ?`,
        [organizationSlug]
      );

      if (slugOrgs.length > 0) {
        return NextResponse.json(
          { error: 'Organization slug already taken' },
          { status: 400 }
        );
      }

      organizationId = `org_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await tursoQuery(
        dbUrl,
        dbToken,
        `INSERT INTO organizations (id, name, slug, email, isActive, aiEnabled, aiDailyLimit, aiDailyUsed)
              VALUES (?, ?, ?, ?, 1, 1, 1000, 0)`,
        [organizationId, organizationName, organizationSlug, email.toLowerCase()]
      );
    }

    // Create user
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const hashedPassword = await hashPassword(password);

    await tursoQuery(
      dbUrl,
      dbToken,
      `INSERT INTO users (id, email, password, name, role, organizationId, isActive) VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [userId, email.toLowerCase(), hashedPassword, name, organizationId ? 'ORG_ADMIN' : 'CHAT_OPERATOR', organizationId || null]
    );

    // Generate token and set cookie
    const token = await generateToken({
      userId,
      email: email.toLowerCase(),
      name,
      role: organizationId ? 'ORG_ADMIN' : 'CHAT_OPERATOR',
      organizationId: organizationId || null,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: userId,
        email: email.toLowerCase(),
        name,
        role: organizationId ? 'ORG_ADMIN' : 'CHAT_OPERATOR',
        organizationId: organizationId || null,
        avatar: null,
      },
      message: 'Registration successful',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
