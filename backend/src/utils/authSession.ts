import jwt from 'jsonwebtoken';
import JWT_SECRET, { TOKEN_LIFETIME } from '../config/jwt.js';
import { Role, ROLES, highestRole } from './roles.js';
import { getUserRoles, setUserRoles } from './userRoles.js';

/**
 * Erzwingt ADMIN-Rechte für in ADMIN_EMAILS gelistete Adressen (persistiert in
 * der DB) und liefert die effektiven Rollen fürs Token zurück. Geteilt zwischen
 * Passwort-Login und Passkey-Login, damit beide Wege garantiert dieselbe
 * Rechte-Logik anwenden - ein Drift zwischen zwei Kopien wäre hier ein
 * Sicherheitsrisiko, kein Stilfehler.
 *
 * ADMIN wird ergänzt, nicht ersetzt: wer zusätzlich Trainer ist, bleibt es.
 */
export async function resolveRolesAndForceAdmin(user: { id: number; email: string | null }): Promise<Role[]> {
  const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.toLowerCase().split(',').map(e => e.trim()) : [];
  const roles = await getUserRoles(user.id);

  if (user.email && adminEmails.includes(user.email.toLowerCase()) && !roles.includes(ROLES.ADMIN)) {
    console.warn(`[SECURITY] ADMIN_EMAILS override: User #${user.id} (${user.email}) erhält zusätzlich ADMIN (bisher: ${roles.join(', ')})`);
    return setUserRoles(user.id, [...roles, ROLES.ADMIN]);
  }

  return roles;
}

/**
 * Signiert das Sitzungs-Token.
 *
 * `roles` ist maßgeblich; `role` wird als höchste Stufe mitgeschrieben, damit
 * ein Rollback auf ein älteres Image die bereits ausgegebenen Tokens noch
 * lesen kann. Berechtigungen werden ohnehin serverseitig aus der Datenbank
 * geprüft, nicht aus dem Token.
 */
export function signSessionToken(userId: number, roles: readonly Role[]): string {
  return jwt.sign(
    { userId, roles, role: highestRole(roles) },
    JWT_SECRET,
    { expiresIn: TOKEN_LIFETIME }
  );
}
