export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

/**
 * Get webhook configuration
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    const configs = await db.query<{
      id: string;
      webhookUrl: string;
      verifyToken: string;
      subscribedEvents: string;
      isConfigured: number;
      lastUpdated: string;
    }>(
      `SELECT id, webhookUrl, verifyToken, subscribedEvents, isConfigured, lastUpdated
       FROM webhook_config
       WHERE organizationId = ?`,
      [user.organizationId]
    );

    const config = configs[0];

    if (!config) {
      return NextResponse.json({
        config: {
          id: '',
          webhookUrl: '',
          verifyToken: '',
          subscribedEvents: ['messages', 'message_status', 'message_template_status_update'],
          isConfigured: false,
          lastUpdated: '',
        },
      });
    }

    return NextResponse.json({
      config: {
        id: config.id,
        webhookUrl: config.webhookUrl,
        verifyToken: config.verifyToken,
        subscribedEvents: config.subscribedEvents
          ? config.subscribedEvents.split(',')
          : ['messages', 'message_status', 'message_template_status_update'],
        isConfigured: config.isConfigured === 1,
        lastUpdated: config.lastUpdated,
      },
    });
  } catch (error: any) {
    console.error('Get webhook config error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Save webhook configuration
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { webhookUrl, verifyToken } = body;

    if (!webhookUrl || !verifyToken) {
      return NextResponse.json(
        { error: 'Missing required fields: webhookUrl, verifyToken' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(webhookUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL format' },
        { status: 400 }
      );
    }

    const subscribedEvents = ['messages', 'message_status', 'message_template_status_update'];
    const id = `webhook_${user.organizationId}`;

    // Check if config exists
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM webhook_config WHERE organizationId = ?`,
      [user.organizationId]
    );

    if (existing.length > 0) {
      // Update
      await db.execute(
        `UPDATE webhook_config 
         SET webhookUrl = ?, verifyToken = ?, subscribedEvents = ?, isConfigured = 1, lastUpdated = CURRENT_TIMESTAMP
         WHERE organizationId = ?`,
        [webhookUrl, verifyToken, subscribedEvents.join(','), user.organizationId]
      );
    } else {
      // Insert
      await db.execute(
        `INSERT INTO webhook_config 
         (id, organizationId, webhookUrl, verifyToken, subscribedEvents, isConfigured)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [id, user.organizationId, webhookUrl, verifyToken, subscribedEvents.join(',')]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook configuration saved successfully',
      config: {
        id,
        webhookUrl,
        verifyToken,
        subscribedEvents,
        isConfigured: true,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Save webhook config error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Get webhook configuration by verify token (for webhook verification)
 * This is called from the webhook endpoint to validate the token
 */
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const verifyToken = searchParams.get('verifyToken');

    if (!organizationId || !verifyToken) {
      return NextResponse.json(
        { error: 'Missing organizationId or verifyToken' },
        { status: 400 }
      );
    }

    const db = getDbContext();

    const configs = await db.query<{
      verifyToken: string;
      webhookUrl: string;
    }>(
      `SELECT verifyToken, webhookUrl FROM webhook_config 
       WHERE organizationId = ? AND verifyToken = ?`,
      [organizationId, verifyToken]
    );

    if (configs.length === 0) {
      return NextResponse.json(
        { error: 'Invalid verify token' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      webhookUrl: configs[0].webhookUrl,
    });
  } catch (error: any) {
    console.error('Verify webhook token error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
