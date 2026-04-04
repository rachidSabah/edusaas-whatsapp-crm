export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-hybrid';
import { getDbContext } from '@/lib/db-hybrid';

/**
 * Get all Meta WhatsApp numbers for organization
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

    const numbers = await db.query<{
      id: string;
      phoneNumberId: string;
      displayPhoneNumber: string;
      accessToken: string;
      isActive: number;
      isPrimary: number;
      createdAt: string;
    }>(
      `SELECT id, phoneNumberId, displayPhoneNumber, accessToken, isActive, isPrimary, createdAt
       FROM whatsapp_meta_numbers
       WHERE organizationId = ?
       ORDER BY isPrimary DESC, createdAt DESC`,
      [user.organizationId]
    );

    return NextResponse.json({
      numbers: numbers.map(n => ({
        ...n,
        isActive: n.isActive === 1,
        isPrimary: n.isPrimary === 1,
      })),
    });
  } catch (error: any) {
    console.error('Get numbers error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Add new Meta WhatsApp number
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
    const { phoneNumberId, accessToken } = body;

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the credentials by fetching phone number info
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
            error: 'Invalid credentials',
            details: error.error?.message,
          },
          { status: 400 }
        );
      }

      const data = await response.json() as {
        display_phone_number?: string;
        phone_number_id?: string;
      };

      // Check if this number already exists
      const existing = await db.query<{ id: string }>(
        `SELECT id FROM whatsapp_meta_numbers WHERE phoneNumberId = ? AND organizationId = ?`,
        [phoneNumberId, user.organizationId]
      );

      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'This number is already configured' },
          { status: 400 }
        );
      }

      // Check if this is the first number (should be primary)
      const count = await db.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM whatsapp_meta_numbers WHERE organizationId = ?`,
        [user.organizationId]
      );

      const isPrimary = count[0]?.count === 0 ? 1 : 0;

      // Insert new number
      const id = `meta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.execute(
        `INSERT INTO whatsapp_meta_numbers 
         (id, organizationId, phoneNumberId, displayPhoneNumber, accessToken, isActive, isPrimary)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [id, user.organizationId, phoneNumberId, data.display_phone_number, accessToken, isPrimary]
      );

      return NextResponse.json({
        success: true,
        message: 'Number added successfully',
        number: {
          id,
          phoneNumberId,
          displayPhoneNumber: data.display_phone_number,
          isPrimary: isPrimary === 1,
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to verify credentials', details: String(error) },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Add number error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Update Meta WhatsApp number (set as primary, etc.)
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
    const { id, isPrimary } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing number ID' },
        { status: 400 }
      );
    }

    if (isPrimary) {
      // Remove primary from all other numbers
      await db.execute(
        `UPDATE whatsapp_meta_numbers SET isPrimary = 0 WHERE organizationId = ?`,
        [user.organizationId]
      );

      // Set this number as primary
      await db.execute(
        `UPDATE whatsapp_meta_numbers SET isPrimary = 1 WHERE id = ? AND organizationId = ?`,
        [id, user.organizationId]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Number updated successfully',
    });
  } catch (error: any) {
    console.error('Update number error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Delete Meta WhatsApp number
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing number ID' },
        { status: 400 }
      );
    }

    // Delete the number
    await db.execute(
      `DELETE FROM whatsapp_meta_numbers WHERE id = ? AND organizationId = ?`,
      [id, user.organizationId]
    );

    return NextResponse.json({
      success: true,
      message: 'Number deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete number error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
