export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { BaileysSessionService } from '@/lib/baileys-service';

// Render service URL with fallback
const RENDER_SERVICE_URL = process.env.RENDER_BAILEYS_URL || 'https://edusaas-whatsapp-baileys.onrender.com';

/**
 * GET /api/whatsapp/baileys/qr
 * Get the current QR code for Baileys connection
 * 
 * Query params:
 * - phoneNumber: The phone number to get QR for (optional, uses default if not provided)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber') || 'default';

    // First, try to get QR from Render service directly
    try {
      const renderResponse = await fetch(`${RENDER_SERVICE_URL}/qr?phoneNumber=${encodeURIComponent(phoneNumber)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Short timeout to avoid hanging
        signal: AbortSignal.timeout(8000),
      });
      
      if (renderResponse.ok) {
        const renderData = await renderResponse.json();
        // If Render has a valid response, return it
        if (renderData.status === 'connected' || renderData.qrCode) {
          return NextResponse.json(renderData, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          });
        }
      }
    } catch (renderError) {
      console.log('Render service unavailable, falling back to database:', renderError);
      // Continue to database fallback
    }

    // Get existing session from database
    const session = await BaileysSessionService.getSession(phoneNumber);

    if (!session) {
      return NextResponse.json(
        {
          status: 'waiting',
          message: 'Aucune session trouvée. Cliquez sur "Démarrer la connexion" pour commencer.',
        },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    // If already connected, return success status
    if (session.status === 'connected') {
      return NextResponse.json({
        status: 'connected',
        phoneNumber: session.phoneNumber,
        message: 'Déjà connecté à WhatsApp',
        lastActivity: session.lastActivity,
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // If QR code exists, return it
    if (session.qrCode) {
      return NextResponse.json({
        status: 'pending',
        qrCode: session.qrCode,
        phoneNumber: session.phoneNumber,
        message: 'Scannez le code QR avec votre application WhatsApp',
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    // If no QR code yet, return waiting status
    return NextResponse.json({
      status: 'waiting',
      phoneNumber: session.phoneNumber,
      message: 'En attente de génération du code QR. Veuillez réessayer dans quelques secondes.',
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error getting QR code:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to get QR code',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}

/**
 * POST /api/whatsapp/baileys/qr
 * Initiate a new Baileys connection and generate QR code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phoneNumber = 'default' } = body;

    // Check if already connected
    const existingSession = await BaileysSessionService.getSession(phoneNumber);
    if (existingSession?.status === 'connected') {
      return NextResponse.json(
        {
          status: 'connected',
          message: 'Ce numéro est déjà connecté à WhatsApp',
          phoneNumber,
        },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    // Create new session with connecting status
    await BaileysSessionService.updateStatus(phoneNumber, 'connecting');

    // Call the Render service to initiate the connection
    let renderConnected = false;
    let renderError = null;
    
    try {
      const renderResponse = await fetch(`${RENDER_SERVICE_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: phoneNumber }),
        signal: AbortSignal.timeout(15000), // 15 second timeout
      });
      
      if (renderResponse.ok) {
        renderConnected = true;
        const renderData = await renderResponse.json();
        // If Render returns a QR code immediately, pass it through
        if (renderData.qrCode) {
          return NextResponse.json({
            status: 'pending',
            phoneNumber,
            qrCode: renderData.qrCode,
            message: 'Scannez le code QR avec votre application WhatsApp',
          }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          });
        }
      } else {
        renderError = `Render service returned ${renderResponse.status}`;
      }
    } catch (e) {
      console.error('Render service error:', e);
      renderError = e instanceof Error ? e.message : 'Unknown error';
      // Continue with local status - Render might be waking up
    }

    return NextResponse.json({
      status: 'pending',
      phoneNumber,
      message: renderConnected 
        ? 'Connexion initiée. Veuillez attendre l\'apparition du code QR.'
        : 'Service en cours de démarrage. Veuillez réessayer dans 30 secondes.',
      renderStatus: renderConnected ? 'connected' : 'waking_up',
      renderError: renderError,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error initiating Baileys connection:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to initiate connection',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}

/**
 * DELETE /api/whatsapp/baileys/qr
 * Disconnect a Baileys session
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber') || 'default';

    // Also disconnect from Render service
    try {
      await fetch(`${RENDER_SERVICE_URL}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: phoneNumber }),
        signal: AbortSignal.timeout(8000),
      });
    } catch (e) {
      console.log('Render disconnect error (non-critical):', e);
    }

    await BaileysSessionService.disconnectSession(phoneNumber);

    return NextResponse.json({
      status: 'disconnected',
      phoneNumber,
      message: 'Session déconnectée avec succès',
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error disconnecting session:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to disconnect',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}
