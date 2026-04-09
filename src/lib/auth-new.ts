// Authentication utilities for Multi-Tenant WhatsApp CRM SaaS
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import db from './db';
import { USER_ROLES, SESSION_CONFIG } from './constants';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  organizationId: string | null;
  name: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
  avatar: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, SESSION_CONFIG.jwtSecret, { expiresIn: SESSION_CONFIG.tokenExpiry });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, SESSION_CONFIG.jwtSecret) as JWTPayload;
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_CONFIG.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_CONFIG.cookieName);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_CONFIG.cookieName)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const result = await db.execute({
      sql: 'SELECT id, email, name, role, organizationId, avatar, isActive FROM users WHERE id = ?',
      args: [payload.userId],
    });

    const user = result.rows[0];
    if (!user || user.isActive !== 1) return null;

    return {
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      role: user.role as string,
      organizationId: user.organizationId as string | null,
      avatar: user.avatar as string | null,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  if (userRole === USER_ROLES.SUPER_ADMIN) return true;
  return requiredRoles.includes(userRole);
}

export async function authenticateUser(email: string, password: string): Promise<{ user: AuthUser; token: string } | null> {
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ? AND isActive = 1',
    args: [email.toLowerCase()],
  });

  const user = result.rows[0];
  if (!user) return null;

  const isValid = await verifyPassword(password, user.password as string);
  if (!isValid) return null;

  await db.execute({
    sql: 'UPDATE users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?',
    args: [user.id],
  });

  const payload: JWTPayload = {
    userId: user.id as string,
    email: user.email as string,
    role: user.role as string,
    organizationId: user.organizationId as string | null,
    name: user.name as string,
  };

  return { 
    user: { 
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      role: user.role as string,
      organizationId: user.organizationId as string | null,
      avatar: user.avatar as string | null,
    }, 
    token: generateToken(payload) 
  };
}

export async function createUser(data: { 
  email: string; 
  password: string; 
  name: string; 
  role?: string; 
  organizationId?: string 
}): Promise<AuthUser> {
  const hashedPassword = await hashPassword(data.password);
  const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);

  await db.execute({
    sql: 'INSERT INTO users (id, email, password, name, role, organizationId, isActive) VALUES (?, ?, ?, ?, ?, ?, 1)',
    args: [id, data.email.toLowerCase(), hashedPassword, data.name, data.role || 'CHAT_OPERATOR', data.organizationId || null],
  });

  return { 
    id, 
    email: data.email.toLowerCase(), 
    name: data.name, 
    role: data.role || 'CHAT_OPERATOR', 
    organizationId: data.organizationId || null, 
    avatar: null 
  };
}
