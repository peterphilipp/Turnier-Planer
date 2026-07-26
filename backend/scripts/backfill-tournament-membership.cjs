/**
 * Einmaliges Backfill: TournamentMembership wurde nachtraeglich eingefuehrt
 * (Multi-Turnier-Support im Self-Service). Bestehende Helfer haben ihre
 * tatsaechliche Turnier-Zugehoerigkeit bisher nur implizit ueber
 * VolunteerShift.tournamentId, FoodDonation.tournamentId und User.tournamentId
 * ausgedrueckt - ohne Backfill wuerden abgeschlossene Turniere fuer sie im
 * Self-Service-Umschalter fehlen, und Push-Broadcasts pro Turnier wuerden sie
 * nicht treffen, bis sie erneut aktiv werden.
 *
 * Leitet TournamentMembership-Zeilen aus drei Quellen ab:
 *  - VolunteerShift (userId, tournamentId)
 *  - FoodDonation (userId, tournamentId)
 *  - User.tournamentId (aktuelle Praeferenz/Zuweisung)
 *
 * Idempotent: nutzt upsert auf dem unique (userId, tournamentId) - wiederholtes
 * Ausfuehren aendert nach dem ersten Lauf nichts mehr.
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const pairsMap = new Map(); // key: `${userId}:${tournamentId}` -> { userId, tournamentId }

    const addPair = (userId, tournamentId) => {
      if (!userId || !tournamentId) return;
      pairsMap.set(`${userId}:${tournamentId}`, { userId, tournamentId });
    };

    const shifts = await prisma.volunteerShift.findMany({ select: { userId: true, tournamentId: true } });
    shifts.forEach(s => addPair(s.userId, s.tournamentId));

    const donations = await prisma.foodDonation.findMany({ select: { userId: true, tournamentId: true } });
    donations.forEach(d => addPair(d.userId, d.tournamentId));

    const users = await prisma.user.findMany({ select: { id: true, tournamentId: true } });
    users.forEach(u => addPair(u.id, u.tournamentId));

    const pairs = Array.from(pairsMap.values());

    if (pairs.length === 0) {
      console.log('[backfill-tournament-membership] Keine Nutzer-Turnier-Beziehungen gefunden – nichts zu tun.');
      return;
    }

    let created = 0;
    for (const { userId, tournamentId } of pairs) {
      const existing = await prisma.tournamentMembership.findUnique({
        where: { userId_tournamentId: { userId, tournamentId } }
      });
      if (existing) continue;
      await prisma.tournamentMembership.create({ data: { userId, tournamentId } });
      created++;
    }

    console.log(`[backfill-tournament-membership] ${pairs.length} Beziehung(en) geprüft, ${created} neu angelegt.`);
  } catch (e) {
    console.error('[backfill-tournament-membership] Fehler:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
