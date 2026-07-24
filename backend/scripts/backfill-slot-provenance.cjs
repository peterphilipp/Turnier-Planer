/**
 * Einmaliges Backfill: DaySlot.sourceGlobalSlotId wurde erst nachtraeglich
 * eingefuehrt (siehe migrate-day-slot-system.cjs / Schema-Aenderung). Tage,
 * die VOR diesem Feld ueber eine Vorlage angelegt wurden, haben dieses Feld
 * noch auf null stehen - dadurch bleibt der Vorlagen-Filter in generateShifts
 * fuer sie wirkungslos (permissiv statt eingeschraenkt).
 *
 * Dieses Skript ordnet solchen "verwaisten" Slots ihren Katalog-Slot anhand
 * von (TournamentDay.sourceTemplateId, startMin, endMin) zu - das Tripel
 * identifiziert einen Katalog-Slot eindeutig. Mehrdeutige oder nicht
 * zuordenbare Faelle (kein sourceTemplateId, kein eindeutiger Treffer)
 * bleiben unveraendert (weiterhin permissiv, kein Datenverlust).
 *
 * Idempotent: Slots mit bereits gesetztem sourceGlobalSlotId werden nicht
 * angefasst; wiederholtes Ausfuehren aendert nach dem ersten Lauf nichts mehr.
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const orphanSlots = await prisma.daySlot.findMany({
      where: { sourceGlobalSlotId: null },
      include: { day: true }
    });

    if (orphanSlots.length === 0) {
      console.log('[backfill-slot-provenance] Keine Slots ohne Vorlagen-Herkunft gefunden – nichts zu tun.');
      return;
    }

    let fixed = 0;
    let skippedNoTemplate = 0;
    let skippedAmbiguous = 0;

    for (const slot of orphanSlots) {
      const templateId = slot.day.sourceTemplateId;
      if (!templateId) { skippedNoTemplate++; continue; }

      const matches = await prisma.globalDaySlot.findMany({
        where: { templateId, startMin: slot.startMin, endMin: slot.endMin }
      });

      if (matches.length !== 1) { skippedAmbiguous++; continue; }

      await prisma.daySlot.update({ where: { id: slot.id }, data: { sourceGlobalSlotId: matches[0].id } });
      fixed++;
    }

    console.log(`[backfill-slot-provenance] ${fixed} Slot(s) zugeordnet, ${skippedNoTemplate} ohne Vorlage übersprungen, ${skippedAmbiguous} mehrdeutig/kein Treffer übersprungen.`);
    if (fixed > 0) {
      console.log('[backfill-slot-provenance] Hinweis: Bereits generierte Schichten wurden NICHT rueckwirkend bereinigt. Empfehlung: im Admin-Bereich "Schichten loeschen" + "Shifts generieren" erneut ausfuehren, damit der Vorlagen-Filter greift.');
    }
  } catch (e) {
    console.error('[backfill-slot-provenance] Fehler:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
