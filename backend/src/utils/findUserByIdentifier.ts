import prisma from '../config/prisma.js';

/**
 * Sucht einen Nutzer anhand von Name ODER E-Mail, ohne auf Gross-/
 * Kleinschreibung zu achten.
 *
 * Hintergrund: Die Anmeldung verglich Namen zeichengenau. Mobile Tastaturen
 * schreiben den ersten Buchstaben aber automatisch gross - wer "torben
 * feldmann" heisst, konnte sich am Handy praktisch nicht anmelden und bekam
 * "Benutzer nicht gefunden", was nach einem geloeschten Konto aussieht. Fuer
 * Nutzer ohne hinterlegte E-Mail war damit auch jeder Wiederherstellungsweg
 * blockiert, denn PIN- und Push-Reset suchen ebenfalls ueber den Namen.
 *
 * Prisma kann bei SQLite kein `mode: 'insensitive'`, daher der Umweg ueber
 * LOWER() in einer parametrisierten Rohabfrage. Einschraenkung: SQLite faltet
 * dabei nur ASCII - "MÜLLER" und "Müller" gelten weiterhin als verschieden.
 * Der praktisch relevante Fall (erster Buchstabe gross statt klein) ist
 * abgedeckt.
 *
 * Gibt nur die ID zurueck; der Aufrufer laedt den Nutzer danach so, wie er
 * ihn braucht (mit/ohne Relationen).
 */
export async function findUserIdByIdentifier(identifier: string): Promise<number | null> {
  const gesucht = identifier.trim().toLowerCase();
  if (!gesucht) return null;

  const treffer = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM users
    WHERE LOWER(email) = ${gesucht} OR LOWER(name) = ${gesucht}
    LIMIT 1
  `;
  return treffer[0]?.id ?? null;
}

/** Wie oben, aber ausschliesslich ueber den Namen. */
export async function findUserIdByName(name: string): Promise<number | null> {
  const gesucht = name.trim().toLowerCase();
  if (!gesucht) return null;

  const treffer = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM users WHERE LOWER(name) = ${gesucht} LIMIT 1
  `;
  return treffer[0]?.id ?? null;
}
