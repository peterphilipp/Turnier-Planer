import webpush from 'web-push';
import prisma from '../config/prisma.js';

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const mailto = process.env.VAPID_MAILTO || 'mailto:noreply@turnier-planer.mygate.dedyn.io';

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(mailto, publicKey, privateKey);
    console.log('[OK] Web-Push (VAPID) erfolgreich initialisiert.');
  } catch (err) {
    console.error('Fehler beim Initialisieren der VAPID-Details:', err);
  }
} else {
  console.warn('[WARN] VAPID-Schlüssel fehlen in .env, Web-Push ist deaktiviert.');
}

export function getVapidPublicKey(): string | null {
  return publicKey || null;
}

export async function sendPushToUser(
  userId: number,
  title: string,
  body: string,
  url: string = '/'
): Promise<void> {
  if (!publicKey || !privateKey) {
    console.warn('Web-Push nicht konfiguriert (VAPID-Schlüssel fehlen).');
    return;
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) {
      console.warn(`[Push-WARN] Keine aktiven Push-Abonnements für User ID ${userId} in der Datenbank!`);
      return;
    }

    console.log(`[Push] Sende Benachrichtigung "${title}" an User ID ${userId} (${subscriptions.length} Abos)...`);

    const payload = JSON.stringify({
      title,
      body,
      url
    });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          payload
        );
        console.log(`[Push-OK] Nachricht an Sub ID ${sub.id} (User ${userId}) erfolgreich versendet.`);
      } catch (err: any) {
        // Immer mit Statuscode loggen: 401/403 (VAPID-Schluessel passt nicht mehr
        // zum Abo, z.B. nach einer Schluessel-Rotation) sah bisher genauso aus wie
        // ein harmloser Netzwerkfehler im Log - schwer zu unterscheiden ohne Code.
        console.error(`[Push-FEHLER] Sub ${sub.id} (User ${userId}): HTTP ${err.statusCode ?? '?'} ${err.body || err.message || err}`);

        // 404/410: Abo abgelaufen oder PWA deinstalliert.
        // 401/403: Push-Dienst akzeptiert den VAPID-Schluessel fuer dieses Abo
        // nicht mehr (typischerweise nach einer Schluessel-Rotation auf dem
        // Server) - genauso dauerhaft kaputt wie ein abgelaufenes Abo, ein Retry
        // hilft nie. In beiden Faellen loeschen, damit sich das Geraet beim
        // naechsten App-Start automatisch neu registriert (siehe
        // subscribeToPushNotifications im Frontend).
        if ([401, 403, 404, 410].includes(err.statusCode)) {
          try {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          } catch {
            // Ignorieren, falls bereits parallel gelöscht
          }
        }
      }
    }
  } catch (err: any) {
    console.error(`Fehler in sendPushToUser für User ${userId}:`, err.message || err);
  }
}
