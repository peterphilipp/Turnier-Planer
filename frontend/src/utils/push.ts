import { apiFetch, apiPost } from '../api';

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

export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push messaging is not supported');
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Already subscribed
      return true;
    }

    const { publicKey } = await apiFetch('/api/auth/vapid-public-key');
    if (!publicKey) throw new Error('No VAPID public key available');

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    await apiPost('/api/auth/push/subscribe', subscription.toJSON());
    return true;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return false;
  }
}
