import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import JWT_SECRET, { TOKEN_LIFETIME } from '../config/jwt.js';

/**
 * Erzwingt ADMIN-Rechte für in ADMIN_EMAILS gelistete Adressen (persistiert in
 * der DB) und liefert die effektive Rolle fürs Token zurück. Geteilt zwischen
 * Passwort-Login und Passkey-Login, damit beide Wege garantiert dieselbe
 * Rechte-Logik anwenden - ein Drift zwischen zwei Kopien wäre hier ein
 * Sicherheitsrisiko, kein Stilfehler.
 */
export async function resolveRoleAndForceAdmin(user: { id: number; email: string | null; role: string }): Promise<string> {
  const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.toLowerCase().split(',').map(e => e.trim()) : [];
  let role = typeof user.role === 'string' && ['HELPER', 'ORGANIZER', 'ADMIN'].includes(user.role) ? user.role : 'HELPER';

  if (user.email && adminEmails.includes(user.email.toLowerCase()) && role !== 'ADMIN') {
    console.warn(`[SECURITY] ADMIN_EMAILS override: User #${user.id} (${user.email}) promoted from ${role} to ADMIN`);
    role = 'ADMIN';
    await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
  }

  return role;
}

export function signSessionToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: TOKEN_LIFETIME });
}
