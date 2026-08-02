/**
 * Rollen-System für das TSV Holm Planungstool.
 *
 * Ein Nutzer kann MEHRERE Rollen gleichzeitig haben. Das ist nötig, weil die
 * Rollen zwei verschiedene Dinge ausdrücken:
 *
 *   Berechtigungsstufe (aufsteigend):
 *     HELPER      → nur Self-Service (Jobs, Verpflegung)
 *     ORGANIZER   → zusätzlich Admin-Bereich
 *     ADMIN       → zusätzlich Benutzer- und DB-Verwaltung
 *
 *   Zusätzlicher Hut, unabhängig von der Stufe:
 *     TRAINER     → sieht die Zusagen der Eltern seiner Jahrgänge
 *
 * Vorher war das ein einzelnes Feld, wodurch sich Stufe und Hut gegenseitig
 * ausgeschlossen haben - ein Admin konnte nicht zugleich Trainer sein.
 */

export const ROLES = {
  HELPER: 'HELPER',
  ORGANIZER: 'ORGANIZER',
  ADMIN: 'ADMIN',
  TRAINER: 'TRAINER'
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ALL_ROLES: Role[] = [ROLES.HELPER, ROLES.ORGANIZER, ROLES.ADMIN, ROLES.TRAINER];

/** Rollen, die den Admin-Bereich öffnen. */
const ADMIN_ROLES: Role[] = [ROLES.ADMIN, ROLES.ORGANIZER];

/** Reihenfolge der Berechtigungsstufe - TRAINER ist bewusst keine Stufe. */
const STUFEN: Role[] = [ROLES.HELPER, ROLES.ORGANIZER, ROLES.ADMIN];

export function isValidRole(role: unknown): role is Role {
  return typeof role === 'string' && (ALL_ROLES as string[]).includes(role);
}

/** Unbekanntes säubern, Duplikate entfernen, nie leer zurückgeben. */
export function normalizeRoles(input: unknown): Role[] {
  const roh = Array.isArray(input) ? input : [input];
  const sauber = Array.from(new Set(roh.filter(isValidRole))) as Role[];
  return sauber.length > 0 ? sauber : [ROLES.HELPER];
}

export function hasRole(roles: readonly string[], required: Role): boolean {
  return roles.includes(required);
}

/** Admin oder Organisator - öffnet den Admin-Bereich. */
export function hasAdminAccess(roles: readonly string[]): boolean {
  return roles.some(r => (ADMIN_ROLES as string[]).includes(r));
}

/** Nur echte Admins - für turnierübergreifende Verwaltung. */
export function isAdmin(roles: readonly string[]): boolean {
  return roles.includes(ROLES.ADMIN);
}

export function isTrainer(roles: readonly string[]): boolean {
  return roles.includes(ROLES.TRAINER);
}

/**
 * Höchste Berechtigungsstufe als Einzelwert.
 *
 * Nur für die Abwärtskompatibilität: die Spalte users.role und das Feld
 * `role` im Token werden weiter mitgeschrieben, damit ein Rollback auf eine
 * ältere Image-Version die Anmeldung nicht zerlegt. Neuer Code soll die
 * Rollenliste auswerten, nicht diesen Wert.
 */
export function highestRole(roles: readonly string[]): Role {
  let hoechste: Role = ROLES.HELPER;
  for (const r of roles) {
    const idx = STUFEN.indexOf(r as Role);
    if (idx > STUFEN.indexOf(hoechste)) hoechste = STUFEN[idx];
  }
  return hoechste;
}
