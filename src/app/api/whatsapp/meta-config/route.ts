export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

interface MetaConfig {
  businessAccountId: string;
  phoneNumberId: string;
  accessToken: string;
  webhookUrl: string;
  verifyToken: string;
}

/**
 * Get Meta WhatsApp Business API Configuration
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

    // Get Meta configuration from database
    const configs = await db.query<{
      id: string;
      provider: string;
      apiUrl: string;
      apiKey: string;
      instanceId: string | null;
      isActive: number;
    }>(
      `SELECT id, provider, apiUrl, apiKey, instanceId, isActive 
       FROM whatsapp_accounts 
       WHERE organizationId = ? AND provider = 'business-api'`,
      [user.organizationId]
    );

    if (configs.length === 0) {
      return NextResponse.json({
        configured: false,
        message: 'Meta WhatsApp Business API not configured',
      });
    }

    const config = configs[0];

    return NextResponse.json({
      configured: true,
      id: config.id,
      provider: config.provider,
      phoneNumberId: config.apiUrl.split('/').pop(),
      businessAccountId: config.instanceId,
      isActive: config.isActive === 1,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://edusaas.ma'}/api/whatsapp/webhook`,
    });
  } catch (error: any) {
    console.error('Get Meta config error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Configure Meta WhatsApp Business API
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

    const body = await request.json() as Partial<MetaConfig>;
    const {
      businessAccountId,
      phoneNumberId,
      accessToken,
      verifyToken,
    } = body;

    if (!businessAccountId || !phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields: businessAccountId, phoneNumberId, accessToken' },
        { status: 400 }
      );
    }

    // Check if configuration already exists
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM whatsapp_accounts 
       WHERE organizationId = ? AND provider = 'business-api'`,
      [user.organizationId]
    );

    const id = existing.length > 0 
      ? existing[0].id 
      : `wa_meta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (existing.length > 0) {
      // Update existing configuration
      await db.execute(
        `UPDATE whatsapp_accounts 
         SET apiUrl = ?, apiKey = ?, instanceId = ?, isActive = 1, updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [phoneNumberId, accessToken, businessAccountId, id]
      );
    } else {
      // Create new configuration
      await db.execute(
        `INSERT INTO whatsapp_accounts 
         (id, organizationId, provider, apiUrl, apiKey, instanceId, phoneNumber, connectionStatus, isActive)
         VALUES (?, ?, 'business-api', ?, ?, ?, 'Meta Business API', 'connected', 1)`,
        [id, user.organizationId, phoneNumberId, accessToken, businessAccountId]
      );
    }

    // Store verify token in environment or database
    // In production, this should be stored securely
    if (verifyToken) {
      console.log('Verify token configured for webhook verification');
    }

    return NextResponse.json({
      success: true,
      message: 'Meta WhatsApp Business API configured successfully',
      config: {
        id,
        businessAccountId,
        phoneNumberId,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://edusaas.ma'}/api/whatsapp/webhook`,
        setupInstructions: {
          step1: 'Go to Meta App Dashboard',
          step2: 'Navigate to WhatsApp > Configuration',
          step3: `Set Webhook URL to: ${process.env.NEXT_PUBLIC_APP_URL || 'https://edusaas.ma'}/api/whatsapp/webhook`,
          step4: 'Set Verify Token to your chosen token',
          step5: 'Subscribe to messages and message_status events',
        },
      },
    });
  } catch (error: any) {
    console.error('Configure Meta error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Test Meta WhatsApp Business API Connection
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    const body = await request.json() as { accessToken: string; phoneNumberId: string };
    const { accessToken, phoneNumberId } = body;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Test connection by fetching phone number info
    try {
      const response = await fetch(
        `https://graph.facebook.com/v22.0/${phoneNumberId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json(
          {
            success: false,
            error: 'Connection test failed',
            details: error.error?.message || 'Invalid credentials',
          },
          { status: 400 }
        );
      }

      const data = await response.json() as { display_phone_number?: string; phone_number_id?: string };

      return NextResponse.json({
        success: true,
        message: 'Connection test successful',
        phoneNumber: data.display_phone_number,
      });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Connection test failed',
          details: String(error),
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Test Meta connection error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Delete Meta Configuration
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const db = getDbContext();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    // Deactivate Meta configuration
    await db.execute(
      `UPDATE whatsapp_accounts 
       SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
       WHERE organizationId = ? AND provider = 'business-api'`,
      [user.organizationId]
    );

    return NextResponse.json({
      success: true,
      message: 'Meta WhatsApp Business API configuration removed',
    });
  } catch (error: any) {
    console.error('Delete Meta config error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
