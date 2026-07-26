import prisma from '../config/prisma.js';

/**
 * Merkt sich, dass ein User für ein Turnier relevant/aktiv ist (Quelle für
 * Push-Zielgruppen pro Turnier und für "abgeschlossene Turniere", die ein
 * Helfer im Self-Service noch einsehen darf). Wird bei jeder Aktion erzeugt,
 * die einen echten Bezug herstellt (Registrierung mit Auto-Zuweisung,
 * Schicht-Zusage, Verpflegungs-Spende, Admin-Zuweisung) - reines Ansehen/
 * Durchklicken im Turnier-Umschalter erzeugt bewusst KEINE Mitgliedschaft.
 *
 * Upsert statt create, da die Kombination (userId, tournamentId) unique ist
 * und dieselbe Zusage/Spende mehrfach in unterschiedlichen Requests dieselbe
 * Mitgliedschaft treffen kann.
 */
export async function ensureTournamentMembership(userId: number, tournamentId: number | null | undefined): Promise<void> {
  if (!tournamentId) return;
  await prisma.tournamentMembership.upsert({
    where: { userId_tournamentId: { userId, tournamentId } },
    create: { userId, tournamentId },
    update: {}
  });
}
