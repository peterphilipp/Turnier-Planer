/**
 * Einmalige Migrations-Bruecke: Das alte GlobalTimeSlot-Shiftsystem wurde durch
 * das neue Tag-/Slot-System ersetzt (TournamentDay/DaySlot/TournamentWorkArea).
 * Bestehende shifts/volunteer_shifts-Zeilen im ALTEN Format lassen sich nicht
 * automatisch ins neue Schema uebernehmen - die dafuer noetigen neuen
 * Fremdschluessel (day_slot_id, tournament_day_id, tournament_work_area_id)
 * existieren fuer diese Zeilen nicht.
 *
 * Dieses Skript leert NUR diese beiden Tabellen, wenn es das alte Schema
 * erkennt (Spalte zeit_slot_id / arbeitsbereich_id vorhanden). Alle anderen
 * Daten (Turniere, Vereine, Teams, Spiele, Jahrgaenge, Lebensmittel, Benutzer,
 * Materialien, ...) bleiben unberuehrt. Legt vorher ein Backup der DB-Datei an.
 *
 * Idempotent: Auf bereits migrierten bzw. frischen DBs (kein shifts-Tabelle
 * oder bereits neues Schema) passiert nichts.
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function backupDatabaseFile() {
  const url = process.env.DATABASE_URL || '';
  if (!url.startsWith('file:')) return;
  const dbPath = url.slice('file:'.length);
  if (!fs.existsSync(dbPath)) return;
  const dir = path.dirname(dbPath);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = path.join(dir, `pre-dayslot-migration-${stamp}.db`);
  try {
    fs.copyFileSync(dbPath, dest);
    console.log('[migrate-day-slot-system] Backup ->', dest);
  } catch (e) {
    console.warn('[migrate-day-slot-system] Backup fehlgeschlagen (fahre trotzdem fort):', e.message);
  }
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const cols = await prisma.$queryRawUnsafe("PRAGMA table_info('shifts')");
    const hasOldColumns = Array.isArray(cols) && cols.some(c => c.name === 'zeit_slot_id' || c.name === 'arbeitsbereich_id');

    if (!hasOldColumns) {
      console.log('[migrate-day-slot-system] Kein altes Shift-Schema gefunden – nichts zu tun.');
      return;
    }

    console.log('[migrate-day-slot-system] Altes Shift-Schema erkannt – sichere DB und leere shifts/volunteer_shifts...');
    backupDatabaseFile();

    const vs = await prisma.$executeRawUnsafe('DELETE FROM volunteer_shifts');
    const sh = await prisma.$executeRawUnsafe('DELETE FROM shifts');
    console.log(`[migrate-day-slot-system] Entfernt: ${vs} volunteer_shifts, ${sh} shifts (altes Format). Alle anderen Daten bleiben erhalten.`);
  } catch (e) {
    console.error('[migrate-day-slot-system] Fehler:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
