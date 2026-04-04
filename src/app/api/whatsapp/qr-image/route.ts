export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

/**
 * QR Code Image Generation Endpoint
 * Generates a PNG image of the QR code
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('sessionToken');

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Session token is required' },
        { status: 400 }
      );
    }

    // In production, use a QR code library to generate the image
    // For now, return a placeholder SVG QR code
    const qrSvg = generateQRCodeSVG(sessionToken);

    return new NextResponse(qrSvg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('QR code image generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Generate a simple SVG QR code representation
 * In production, use qrcode library
 */
function generateQRCodeSVG(data: string): string {
  // This is a simplified placeholder
  // In production, use: import QRCode from 'qrcode'
  // const qrCode = await QRCode.toDataURL(data);

  const encodedData = encodeURIComponent(data);
  const size = 200;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="white"/>
  <text x="50%" y="50%" font-size="12" text-anchor="middle" dominant-baseline="middle" fill="black">
    QR Code: ${data.substring(0, 20)}...
  </text>
  <text x="50%" y="60%" font-size="10" text-anchor="middle" dominant-baseline="middle" fill="gray">
    Session Token
  </text>
</svg>`;
}
