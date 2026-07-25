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

    if (subscriptions.length === 0) return;

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
      } catch (err: any) {
        // HTTP 404/410 bedeutet, dass das Abo abgelaufen ist oder die PWA deinstalliert wurde
        if (err.statusCode === 404 || err.statusCode === 410) {
          try {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          } catch {
            // Ignorieren, falls bereits parallel gelöscht
          }
        } else {
          console.error(`Fehler beim Senden von Web-Push an Sub ${sub.id}:`, err.message || err);
        }
      }
    }
  } catch (err: any) {
    console.error(`Fehler in sendPushToUser für User ${userId}:`, err.message || err);
  }
}
