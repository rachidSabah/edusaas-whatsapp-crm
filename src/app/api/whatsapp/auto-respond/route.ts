export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getDbContext } from '@/lib/db-hybrid';
import { generateAIResponse, sendAutomatedResponse } from '@/lib/puter-ai';

/**
 * Process incoming WhatsApp message and send automated response if configured
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      organizationId,
      phoneNumber,
      messageContent,
      phoneNumberId,
      accessToken,
    } = body;

    if (!organizationId || !phoneNumber || !messageContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getDbContext();

    // Get AI automation config
    const configs = await db.query<{
      isEnabled: number;
      autoRespondToAll: number;
      responseDelay: number;
    }>(
      `SELECT isEnabled, autoRespondToAll, responseDelay
       FROM ai_automation_config
       WHERE organizationId = ?`,
      [organizationId]
    );

    if (!configs || configs.length === 0 || configs[0].isEnabled === 0) {
      return NextResponse.json({
        success: false,
        message: 'AI automation not enabled',
      });
    }

    const config = configs[0];

    // Check if we should respond to this message
    if (!config.autoRespondToAll && !isQuestion(messageContent)) {
      return NextResponse.json({
        success: false,
        message: 'Not a question, skipping auto-response',
      });
    }

    // Generate AI response
    const aiResponse = await generateAIResponse(organizationId, messageContent, phoneNumber);

    if (!aiResponse) {
      return NextResponse.json({
        success: false,
        message: 'Could not generate response',
      });
    }

    // Apply response delay if configured
    if (config.responseDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.responseDelay * 1000));
    }

    // Get primary phone number for sending
    const phoneNumbers = await db.query<{
      phoneNumberId: string;
      accessToken: string;
    }>(
      `SELECT phoneNumberId, accessToken
       FROM whatsapp_meta_numbers
       WHERE organizationId = ? AND isPrimary = 1
       LIMIT 1`,
      [organizationId]
    );

    if (!phoneNumbers || phoneNumbers.length === 0) {
      return NextResponse.json(
        { error: 'No primary phone number configured' },
        { status: 400 }
      );
    }

    const primaryPhone = phoneNumbers[0];

    // Send automated response
    const sendResult = await sendAutomatedResponse(
      organizationId,
      phoneNumber,
      aiResponse.response,
      primaryPhone.phoneNumberId,
      primaryPhone.accessToken
    );

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error },
        { status: 500 }
      );
    }

    // Log the auto-response
    console.log('Auto-response sent:', {
      organizationId,
      phoneNumber,
      messageId: sendResult.messageId,
      confidence: aiResponse.confidence,
      source: aiResponse.source,
    });

    return NextResponse.json({
      success: true,
      messageId: sendResult.messageId,
      response: aiResponse.response,
      confidence: aiResponse.confidence,
      source: aiResponse.source,
    });
  } catch (error: any) {
    console.error('Auto-respond error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Check if message is a question
 */
function isQuestion(message: string): boolean {
  const questionPatterns = [
    /\?$/,
    /^(qu|comment|pourquoi|quand|où|qui|quoi|quel)/i,
    /^(what|how|why|when|where|who|which)/i,
  ];

  return questionPatterns.some((pattern) => pattern.test(message.trim()));
}
