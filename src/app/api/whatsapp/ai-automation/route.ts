export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

/**
 * Get AI and absence automation configuration
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

    // Get AI config
    const aiConfigs = await db.query<{
      id: string;
      isEnabled: number;
      selectedModel: string;
      responseTemplate: string;
      maxResponseLength: number;
      includeKnowledgeBase: number;
      autoRespondToAll: number;
      responseDelay: number;
    }>(
      `SELECT * FROM ai_automation_config WHERE organizationId = ?`,
      [user.organizationId]
    );

    // Get absence config
    const absenceConfigs = await db.query<{
      id: string;
      isEnabled: number;
      templateName: string;
      sendToParents: number;
      primaryPhoneNumberId: string;
      notifyDelay: number;
    }>(
      `SELECT * FROM absence_notification_config WHERE organizationId = ?`,
      [user.organizationId]
    );

    // Get Meta numbers
    const numbers = await db.query<{
      id: string;
      displayPhoneNumber: string;
    }>(
      `SELECT id, displayPhoneNumber FROM whatsapp_meta_numbers WHERE organizationId = ?`,
      [user.organizationId]
    );

    return NextResponse.json({
      aiConfig: aiConfigs[0] || null,
      absenceConfig: absenceConfigs[0] || null,
      numbers,
    });
  } catch (error: any) {
    console.error('Get automation config error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Save AI configuration
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
    const { aiConfig } = body;

    if (!aiConfig) {
      return NextResponse.json(
        { error: 'Missing AI config' },
        { status: 400 }
      );
    }

    const id = aiConfig.id || `ai_${Date.now()}`;

    // Check if config exists
    const existing = await db.query<{ id: string }>(
      `SELECT id FROM ai_automation_config WHERE organizationId = ?`,
      [user.organizationId]
    );

    if (existing.length > 0) {
      // Update
      await db.execute(
        `UPDATE ai_automation_config 
         SET isEnabled = ?, selectedModel = ?, responseTemplate = ?, 
             maxResponseLength = ?, includeKnowledgeBase = ?, 
             autoRespondToAll = ?, responseDelay = ?
         WHERE organizationId = ?`,
        [
          aiConfig.isEnabled ? 1 : 0,
          aiConfig.selectedModel || 'default',
          aiConfig.responseTemplate,
          aiConfig.maxResponseLength,
          aiConfig.includeKnowledgeBase ? 1 : 0,
          aiConfig.autoRespondToAll ? 1 : 0,
          aiConfig.responseDelay,
          user.organizationId,
        ]
      );
    } else {
      // Insert
      await db.execute(
        `INSERT INTO ai_automation_config 
         (id, organizationId, isEnabled, selectedModel, responseTemplate, 
          maxResponseLength, includeKnowledgeBase, autoRespondToAll, responseDelay)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          user.organizationId,
          aiConfig.isEnabled ? 1 : 0,
          aiConfig.selectedModel || 'default',
          aiConfig.responseTemplate,
          aiConfig.maxResponseLength,
          aiConfig.includeKnowledgeBase ? 1 : 0,
          aiConfig.autoRespondToAll ? 1 : 0,
          aiConfig.responseDelay,
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'AI configuration saved',
    });
  } catch (error: any) {
    console.error('Save AI config error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
