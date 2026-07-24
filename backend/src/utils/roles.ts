/**
 * Rollen-System für das TSV Holm Planungstool.
 * 
 * Rollen (von niedrig nach hoch):
 *   HELPER      → Nur SelfServiceView (Jobs, Verpflegung)
 *   ORGANIZER   → Admin-Bereich + SelfService
 *   ADMIN       → Alles inkl. User-Management
 */

export const ROLES = {
  HELPER: 'HELPER',
  ORGANIZER: 'ORGANIZER',
  ADMIN: 'ADMIN'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/** Alle Rollen mit Admin-Rechten (können alles) */
export const ADMIN_ROLES: Role[] = [ROLES.ADMIN, ROLES.ORGANIZER];

/** Prüft ob eine Rolle Admin-Rechte hat */
export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as Role);
}

/** Prüft ob der User mindestens die geforderte Rolle hat */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
  // Admin/Organizer haben immer Zugriff auf alles
  if (isAdminRole(userRole)) return true;
  
  // Sonst muss die exakte Rolle vorhanden sein
  return userRole === requiredRole;
}

/** Prüft ob der User Admin oder Organisator ist */
export function hasAdminAccess(userRole: Role): boolean {
  return isAdminRole(userRole);
}
