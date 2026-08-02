/**
 * Einmalige Bereinigung: DaySlot war bisher eine Kopie PRO Arbeitsbereich,
 * nicht ein Zeitfenster des Tages.
 *
 * createTournamentDay hat je TemplateWorkArea einen eigenen DaySlot angelegt.
 * Ein Tag mit zwoelf Bereichs-Eintraegen bekam damit zwoelf Slots, von denen
 * viele exakt dieselbe Uhrzeit trugen - unterscheidbar nur ueber die interne
 * Herkunftsspalte. In der Oberflaeche ("Zeit-Slot" beim Anlegen einer Schicht)
 * erschien deshalb dreimal "07:45-11:30", ohne dass ein Mensch haette sagen
 * koennen, welcher Eintrag welcher ist.
 *
 * Ab jetzt ist ein DaySlot genau ein Zeitfenster des Tages und pro Tag
 * eindeutig ueber (Start, Ende). Diese Migration fuehrt die bestehenden
 * Duplikate zusammen, BEVOR das Schema den Unique-Index anlegt - sonst
 * scheitert der "prisma db push" an den vorhandenen Daten.
 *
 * Vorgehen je Tag und Zeitfenster:
 *   1. Der Slot mit der kleinsten Id bleibt bestehen.
 *   2. Alle Schichten der uebrigen Slots werden auf ihn umgehaengt.
 *   3. Entstehen dabei zwei Schichten desselben Arbeitsbereichs im selben
 *      Fenster, bleibt eine davon; ihre Helfer-Zusagen werden zusammengefuehrt.
 *   4. Die leeren Slots werden geloescht.
 *
 * Helfer-Zusagen gehen dabei nie verloren; nur eine doppelte Zusage derselben
 * Person auf dieselbe Schicht wird entfernt.
 *
 * Bewusst reines SQL: das Skript laeuft vor "prisma db push", der Prisma-Client
 * kennt zu diesem Zeitpunkt also bereits das neue Schema, die Datenbank aber
 * noch das alte. Idempotent - nach dem ersten Lauf gibt es keine Duplikate mehr.
 */
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const gruppen = await prisma.$queryRawUnsafe(`
      SELECT tournament_day_id AS tag, start_min AS start, end_min AS ende,
             COUNT(*) AS anzahl, MIN(id) AS behalten
      FROM day_slots
      GROUP BY tournament_day_id, start_min, end_min
      HAVING COUNT(*) > 1
    `);

    if (gruppen.length === 0) {
      console.log('[migrate-dedupe-day-slots] Keine doppelten Zeitfenster gefunden.');
      return;
    }

    let slotsEntfernt = 0;
    let schichtenUmgehaengt = 0;
    let schichtenZusammengefuehrt = 0;
    let zusagenUmgehaengt = 0;
    let zusagenDoppelt = 0;

    for (const g of gruppen) {
      const tag = Number(g.tag);
      const behalten = Number(g.behalten);

      const ueberzaehlig = (await prisma.$queryRawUnsafe(
        `SELECT id FROM day_slots
         WHERE tournament_day_id = ? AND start_min = ? AND end_min = ? AND id <> ?`,
        tag, Number(g.start), Number(g.ende), behalten
      )).map(r => Number(r.id));

      for (const slotId of ueberzaehlig) {
        const schichten = await prisma.$queryRawUnsafe(
          `SELECT id, tournament_work_area_id AS bereich FROM shifts WHERE day_slot_id = ?`,
          slotId
        );

        for (const s of schichten) {
          const schichtId = Number(s.id);
          // Haelt der Zielslot fuer denselben Bereich schon eine Schicht?
          const kollision = await prisma.$queryRawUnsafe(
            `SELECT id FROM shifts
             WHERE day_slot_id = ? AND tournament_work_area_id = ? LIMIT 1`,
            behalten, Number(s.bereich)
          );

          if (kollision.length > 0) {
            const zielSchicht = Number(kollision[0].id);
            // Zusagen hinueberholen, doppelte Personen dabei entfernen.
            const zusagen = await prisma.$queryRawUnsafe(
              `SELECT id, user_id AS nutzer FROM volunteer_shifts WHERE shift_id = ?`,
              schichtId
            );
            for (const z of zusagen) {
              const schonDa = await prisma.$queryRawUnsafe(
                `SELECT id FROM volunteer_shifts
                 WHERE shift_id = ? AND user_id IS ? LIMIT 1`,
                zielSchicht, z.nutzer
              );
              if (schonDa.length > 0) {
                await prisma.$executeRawUnsafe(`DELETE FROM volunteer_shifts WHERE id = ?`, Number(z.id));
                zusagenDoppelt++;
              } else {
                await prisma.$executeRawUnsafe(
                  `UPDATE volunteer_shifts SET shift_id = ? WHERE id = ?`,
                  zielSchicht, Number(z.id)
                );
                zusagenUmgehaengt++;
              }
            }
            await prisma.$executeRawUnsafe(`DELETE FROM shifts WHERE id = ?`, schichtId);
            schichtenZusammengefuehrt++;
          } else {
            await prisma.$executeRawUnsafe(
              `UPDATE shifts SET day_slot_id = ? WHERE id = ?`,
              behalten, schichtId
            );
            schichtenUmgehaengt++;
          }
        }

        await prisma.$executeRawUnsafe(`DELETE FROM day_slots WHERE id = ?`, slotId);
        slotsEntfernt++;
      }
    }

    console.log(
      `[migrate-dedupe-day-slots] ${gruppen.length} Zeitfenster bereinigt: ` +
      `${slotsEntfernt} doppelte Slots entfernt, ${schichtenUmgehaengt} Schichten umgehaengt, ` +
      `${schichtenZusammengefuehrt} Schichten zusammengefuehrt ` +
      `(${zusagenUmgehaengt} Zusagen uebernommen, ${zusagenDoppelt} doppelte entfernt).`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
