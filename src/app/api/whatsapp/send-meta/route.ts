export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';

/**
 * Send message via Meta WhatsApp Business API v22.0
 * Endpoint for sending text messages and templates
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    if (!user.organizationId) {
      return NextResponse.json(
        { error: 'No organization associated' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      phoneNumberId,
      accessToken,
      to,
      type = 'text', // 'text' or 'template'
      text,
      templateName,
      templateLanguage = 'en_US',
      templateParameters,
    } = body;

    if (!phoneNumberId || !accessToken || !to) {
      return NextResponse.json(
        { error: 'Missing required fields: phoneNumberId, accessToken, to' },
        { status: 400 }
      );
    }

    const formattedTo = to.replace(/[^0-9]/g, '');
    const apiUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

    let payload: Record<string, any> = {
      messaging_product: 'whatsapp',
      to: formattedTo,
    };

    if (type === 'text' && text) {
      payload.type = 'text';
      payload.text = { body: text };
    } else if (type === 'template' && templateName) {
      payload.type = 'template';
      payload.template = {
        name: templateName,
        language: { code: templateLanguage },
      };

      if (templateParameters && templateParameters.length > 0) {
        payload.template.components = [
          {
            type: 'body',
            parameters: templateParameters.map((param: string) => ({
              type: 'text',
              text: param,
            })),
          },
        ];
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid message type or missing required fields' },
        { status: 400 }
      );
    }

    // Send request to Meta API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Meta API error:', result);
      let errorMessage = result.error?.message || 'Failed to send message';
      
      // Specific check for expired or invalid token
      if (result.error?.code === 190 || result.error?.error_subcode === 463 || result.error?.error_subcode === 467) {
        errorMessage = 'Votre jeton d\'accès Meta a expiré ou est invalide. Veuillez en générer un nouveau sur le portail Meta Developers.';
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          details: result.error,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: result.messages?.[0]?.id || `msg_${Date.now()}`,
      to: formattedTo,
      message: 'Message sent successfully',
    });
  } catch (error: any) {
    console.error('Error sending Meta message:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to test Meta API connection
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumberId = searchParams.get('phoneNumberId');
    const accessToken = searchParams.get('accessToken');

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing phoneNumberId or accessToken' },
        { status: 400 }
      );
    }

    // Test connection by fetching phone number info
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      let errorMessage = data.error?.message || 'Invalid credentials';
      
      // Specific check for expired or invalid token
      if (data.error?.code === 190 || data.error?.error_subcode === 463 || data.error?.error_subcode === 467) {
        errorMessage = 'Votre jeton d\'accès Meta a expiré ou est invalide. Veuillez en générer un nouveau sur le portail Meta Developers.';
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Connection test failed',
          details: errorMessage,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      phoneNumber: data.display_phone_number,
      phoneNumberId: data.phone_number_id,
      businessAccountId: data.business_account_id,
    });
  } catch (error: any) {
    console.error('Test connection error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
