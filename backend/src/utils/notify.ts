import prisma from '../config/prisma.js';
import { sendPushToUser } from './push.js';

/**
 * Benachrichtigt einen Nutzer ueber ZWEI Kanaele gleichzeitig.
 *
 * Push allein reicht nicht: die App wird selten installiert und
 * Benachrichtigungen noch seltener erlaubt, eine Aenderung am Dienstplan
 * wuerde damit an den meisten Helfern vorbeigehen. Deshalb wird jede Meldung
 * zusaetzlich dauerhaft abgelegt und beim naechsten Oeffnen der App oben
 * angezeigt, bis sie bestaetigt wird.
 *
 * Bewusst fehlertolerant: schlaegt der Push fehl (abgelaufenes Abo, kein
 * Geraet), bleibt die gespeicherte Nachricht trotzdem bestehen. Und ein
 * Fehler beim Benachrichtigen darf nie die eigentliche Aenderung am
 * Dienstplan scheitern lassen.
 */
export async function notifyUser(
  userId: number,
  title: string,
  body: string,
  url: string = '/'
): Promise<void> {
  try {
    await prisma.userNotification.create({ data: { userId, title, body, url } });
  } catch (err) {
    console.error('[Notify] In-App-Nachricht konnte nicht gespeichert werden:', (err as Error).message);
  }
  try {
    await sendPushToUser(userId, title, body, url);
  } catch {
    // Push ist nur der Zusatzkanal - die gespeicherte Nachricht traegt.
  }
}

/** Mehrere Nutzer auf einmal, ohne dass ein Fehler die anderen verhindert. */
export async function notifyUsers(
  userIds: number[],
  title: string,
  body: string,
  url: string = '/'
): Promise<void> {
  const eindeutig = Array.from(new Set(userIds.filter((id): id is number => id != null)));
  await Promise.all(eindeutig.map(id => notifyUser(id, title, body, url)));
}
