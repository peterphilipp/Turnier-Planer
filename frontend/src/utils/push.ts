import { useEffect, useState } from 'react';
import { getVapidPublicKey, subscribeToPush } from '../api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Prüft, ob ein bestehendes Browser-Abo noch mit dem aktuellen Server-VAPID-
 * Schlüssel erstellt wurde. `applicationServerKey` ist in Safari nicht
 * zuverlässig verfügbar - dann bleibt das Abo unangetastet (bisheriges
 * Verhalten), statt fälschlich einen Mismatch anzunehmen.
 */
function keyMatches(existingKey: ArrayBuffer | null, currentPublicKey: string): boolean {
  if (!existingKey) return true;
  const current = urlBase64ToUint8Array(currentPublicKey);
  const existing = new Uint8Array(existingKey);
  if (existing.length !== current.length) return false;
  return existing.every((b, i) => b === current[i]);
}

/**
 * Registriert (oder erneuert) das Push-Abo dieses Geräts und synchronisiert es
 * mit dem Backend. Einzige Stelle, die das tut (vorher gab es eine zweite,
 * fast identische Implementierung in PushNotificationBanner.tsx).
 *
 * Rotiert der Server seine VAPID-Schlüssel (z.B. weil sie neu erzeugt statt
 * aus einer festen .env übernommen wurden), wird ein vorhandenes Browser-Abo
 * sonst einfach unverändert weiter ans Backend gemeldet - der Push-Dienst
 * lehnt es dann aber dauerhaft mit 401/403 ab, ohne dass sich das Gerät je von
 * selbst erholt. Deshalb hier: altes Abo abbestellen und mit dem aktuellen
 * Schlüssel neu erstellen, sobald ein Mismatch erkennbar ist.
 */
export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push messaging is not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const { publicKey } = await getVapidPublicKey();
    if (!publicKey) throw new Error('No VAPID public key available');

    let subscription = await registration.pushManager.getSubscription();

    if (subscription && !keyMatches(subscription.options?.applicationServerKey ?? null, publicKey)) {
      console.warn('Push-Abo nutzt einen veralteten VAPID-Schlüssel, wird erneuert...');
      await subscription.unsubscribe().catch(() => {});
      subscription = null;
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    // WICHTIG: Immer ans Backend senden, auch wenn das Abo im Browser bereits existiert!
    // Nur so stellen wir sicher, dass das Backend das Abonnement nach einem Server-Neustart oder DB-Reset kennt.
    await subscribeToPush(subscription.toJSON());
    console.log('Push-Abonnement erfolgreich mit dem Backend synchronisiert.');
    return true;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return false;
  }
}

/**
 * Liest den aktuellen Push-Status (unterstützt? abonniert?) dieses Geräts.
 * Eigener Hook statt Prop-Drilling, damit sowohl die Setup-Banner
 * (PushNotificationBanner.tsx) als auch der Status-Eintrag im Hamburger-Menü
 * (SelfServiceView.tsx) unabhängig voneinander denselben aktuellen Stand
 * abfragen können, ohne den State eines der beiden zu verrenken.
 */
export function usePushSubscriptionStatus() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupported(true);
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub));
      }).catch(() => {});
    }
  }, []);

  return { supported, subscribed, setSubscribed };
}
