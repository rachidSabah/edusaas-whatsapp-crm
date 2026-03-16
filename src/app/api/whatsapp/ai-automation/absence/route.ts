export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-edge';
import { getDbContext } from '@/lib/db-context';

/**
 * Save absence notification configuration
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
    const { absenceConfig } = body;

    if (!absenceConfig) {
      return NextResponse.json(
        { error: 'Missing absence config' },
        { status: 400 }
      );
    }

    const id = absenceConfig.id || `absence_${Date.now()}`;

    // Check if config exists
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM absence_notification_config WHERE organizationId = ?`,
      [user.organizationId]
    );

    if (existing.length > 0) {
      // Update
      await db.execute(
        `UPDATE absence_notification_config 
         SET isEnabled = ?, templateName = ?, sendToParents = ?, 
             primaryPhoneNumberId = ?, notifyDelay = ?
         WHERE organizationId = ?`,
        [
          absenceConfig.isEnabled ? 1 : 0,
          absenceConfig.templateName,
          absenceConfig.sendToParents ? 1 : 0,
          absenceConfig.primaryPhoneNumberId,
          absenceConfig.notifyDelay,
          user.organizationId,
        ]
      );
    } else {
      // Insert
      await db.execute(
        `INSERT INTO absence_notification_config 
         (id, organizationId, isEnabled, templateName, sendToParents, 
          primaryPhoneNumberId, notifyDelay)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          user.organizationId,
          absenceConfig.isEnabled ? 1 : 0,
          absenceConfig.templateName,
          absenceConfig.sendToParents ? 1 : 0,
          absenceConfig.primaryPhoneNumberId,
          absenceConfig.notifyDelay,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Absence configuration saved',
    });
  } catch (error: any) {
    console.error('Save absence config error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Trigger absence notification (called when student is marked absent)
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

    const body = await request.json();
    const { studentId, parentPhoneNumber, studentName } = body;

    if (!studentId || !parentPhoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get absence config
    const configs = await db.query<{
      isEnabled: number;
      templateName: string;
      primaryPhoneNumberId: string;
    }>(
      `SELECT isEnabled, templateName, primaryPhoneNumberId 
       FROM absence_notification_config WHERE organizationId = ?`,
      [user.organizationId]
    );

    if (!configs[0] || configs[0].isEnabled === 0) {
      return NextResponse.json(
        { error: 'Absence notifications are disabled' },
        { status: 400 }
      );
    }

    const config = configs[0];

    // Get Meta number
    const numbers = await db.query<{
      phoneNumberId: string;
      accessToken: string;
    }>(
      `SELECT phoneNumberId, accessToken FROM whatsapp_meta_numbers 
       WHERE id = ? AND organizationId = ?`,
      [config.primaryPhoneNumberId, user.organizationId]
    );

    if (!numbers[0]) {
      return NextResponse.json(
        { error: 'Primary phone number not found' },
        { status: 400 }
      );
    }

    const number = numbers[0];

    // Send template message via Meta API
    const formattedPhone = parentPhoneNumber.replace(/[^0-9]/g, '');

    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: config.templateName,
        language: { code: 'fr' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: studentName || 'Student' },
            ],
          },
        ],
      },
    };

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${number.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${number.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || 'Failed to send notification',
        },
        { status: 400 }
      );
    }

    // Log the notification
    await db.execute(
      `INSERT INTO absence_notifications 
       (id, organizationId, studentId, parentPhone, templateName, messageId)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        `notif_${Date.now()}`,
        user.organizationId,
        studentId,
        parentPhoneNumber,
        config.templateName,
        result.messages?.[0]?.id || null,
      ]
    );

    return NextResponse.json({
      success: true,
      message: 'Absence notification sent',
      messageId: result.messages?.[0]?.id,
    });
  } catch (error: any) {
    console.error('Send absence notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
