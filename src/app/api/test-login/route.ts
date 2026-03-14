export const runtime = 'edge';

import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('Login attempt for:', email);

    const result = await db.execute({
      sql: `SELECT * FROM users WHERE email = ?`,
      args: [email?.toLowerCase()],
    });

    const user = result.rows[0];
    console.log('User found:', !!user);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password as string);
    console.log('Password valid:', isValid);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal error', details: String(error) }, { status: 500 });
  }
}
