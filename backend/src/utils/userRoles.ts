import prisma from '../config/prisma.js';
import { Role, normalizeRoles, highestRole } from './roles.js';

/**
 * Liest die Rollen eines Nutzers aus der Zuordnungstabelle.
 *
 * Fällt auf die alte Einzelspalte zurück, falls für den Nutzer noch keine
 * Zeilen existieren - das kann zwischen Schema-Push und Backfill kurz der
 * Fall sein und darf nicht dazu führen, dass jemand plötzlich ohne Rechte
 * dasteht.
 */
export async function getUserRoles(userId: number): Promise<Role[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, userRoles: { select: { role: true } } }
  });
  if (!user) return [];
  if (user.userRoles.length > 0) return normalizeRoles(user.userRoles.map(r => r.role));
  return normalizeRoles(user.role);
}

/**
 * Setzt die Rollen eines Nutzers vollständig neu.
 *
 * Schreibt zusätzlich die höchste Stufe in die alte users.role-Spalte, damit
 * ein Rollback auf ein älteres Image weiterhin funktioniert. Diese Spiegelung
 * ist Übergangstechnik und verschwindet mit der Spalte.
 */
export async function setUserRoles(userId: number, roles: unknown): Promise<Role[]> {
  const sauber = normalizeRoles(roles);
  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId } }),
    prisma.userRole.createMany({ data: sauber.map(role => ({ userId, role })) }),
    prisma.user.update({ where: { id: userId }, data: { role: highestRole(sauber) } })
  ]);
  return sauber;
}
