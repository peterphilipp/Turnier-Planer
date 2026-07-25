import prisma from '../config/prisma.js';
import { sendPushToUser } from './push.js';

/** Hilfsfunktion: Minuten seit Mitternacht → „HH:MM" */
const minToTime = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/**
 * Startet den Push-Reminder-Scheduler.
 * Läuft alle 60 Sekunden und prüft:
 *  1. Termin-Reminder: 2 Stunden vor Schichtbeginn
 *  2. Dankeschön + Bewertungs-Reminder: 30 Minuten nach Schichtende
 */
export function startScheduler(): void {
  console.log('[Scheduler] Push-Reminder-Scheduler gestartet (Intervall: 60s).');

  setInterval(async () => {
    try {
      await checkRemindersBefore();
      await checkRemindersAfter();
    } catch (err: any) {
      console.error('[Scheduler] Fehler im Scheduler-Tick:', err?.message || err);
    }
  }, 60_000);
}

/**
 * Termin-Reminder: Sendet eine Push-Nachricht an Helfer,
 * deren Schicht in 90–130 Minuten beginnt (Fenster von 40 Min,
 * damit kein Reminder durch den 60s-Jitter übersprungen wird).
 */
async function checkRemindersBefore(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 90 * 60 * 1000);  // jetzt + 90min
  const windowEnd   = new Date(now.getTime() + 130 * 60 * 1000); // jetzt + 130min

  // Alle VolunteerShifts laden, wo Reminder noch nicht gesendet wurde
  const candidates = await prisma.volunteerShift.findMany({
    where: { reminderSentBefore: false, userId: { not: null } },
    include: { shift: { include: { workArea: true } } }
  });

  for (const vs of candidates) {
    if (!vs.userId || !vs.shift) continue;

    const startMin = vs.shift.startMin;
    if (startMin == null) continue;

    // Schichtbeginn als absolute Zeit berechnen
    const shiftDate = new Date(vs.date);
    const shiftStart = new Date(
      Date.UTC(
        shiftDate.getUTCFullYear(),
        shiftDate.getUTCMonth(),
        shiftDate.getUTCDate(),
        Math.floor(startMin / 60),
        startMin % 60,
        0
      )
    );

    if (shiftStart >= windowStart && shiftStart <= windowEnd) {
      const areaName = vs.shift.workArea?.name || vs.role || 'deiner Schicht';
      const startStr = minToTime(startMin);

      console.log(`[Scheduler] Sende Termin-Reminder an User ${vs.userId} für Schicht ${vs.id} um ${startStr}.`);
      await sendPushToUser(
        vs.userId,
        `⏰ Gleich geht’s los!`,
        `Deine Schicht als ${areaName} beginnt in ca. 2 Stunden (${startStr}). Wir freuen uns auf dich! 💪`,
        '/'
      );

      await prisma.volunteerShift.update({
        where: { id: vs.id },
        data: { reminderSentBefore: true }
      });
    }
  }
}

/**
 * Dankeschön + Bewertungs-Reminder: Sendet eine Push-Nachricht
 * an Helfer, deren Schicht vor 30–90 Minuten geendet hat.
 */
async function checkRemindersAfter(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 90 * 60 * 1000); // jetzt - 90min
  const windowEnd   = new Date(now.getTime() - 30 * 60 * 1000); // jetzt - 30min

  const candidates = await prisma.volunteerShift.findMany({
    where: { thanksSentAfter: false, userId: { not: null } },
    include: { shift: { include: { workArea: true } } }
  });

  for (const vs of candidates) {
    if (!vs.userId || !vs.shift) continue;

    const endMin = vs.shift.endMin;
    if (endMin == null) continue;

    // Schichtende als absolute Zeit berechnen
    const shiftDate = new Date(vs.date);
    const shiftEnd = new Date(
      Date.UTC(
        shiftDate.getUTCFullYear(),
        shiftDate.getUTCMonth(),
        shiftDate.getUTCDate(),
        Math.floor(endMin / 60),
        endMin % 60,
        0
      )
    );

    if (shiftEnd >= windowStart && shiftEnd <= windowEnd) {
      const areaName = vs.shift.workArea?.name || vs.role || 'deiner Schicht';

      console.log(`[Scheduler] Sende Danke+Bewertungs-Reminder an User ${vs.userId} für Schicht ${vs.id}.`);
      await sendPushToUser(
        vs.userId,
        '🙏 Danke für deinen Einsatz!',
        `Du warst als ${areaName} im Einsatz – vielen Dank! Hast du eine Minute? Bewerte deine Schicht gerne in der App. ⭐`,
        '/'
      );

      await prisma.volunteerShift.update({
        where: { id: vs.id },
        data: { thanksSentAfter: true }
      });
    }
  }
}
