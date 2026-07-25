import { useState, useEffect } from 'react';
import { subscribeToPushNotifications, usePushSubscriptionStatus } from '../utils/push';
import { modal } from './admin/Modal';

export default function PushNotificationBanner({ primaryColor = '#198754', textColor = '#fff' }: { primaryColor?: string; textColor?: string }) {
  const { supported, subscribed, setSubscribed } = usePushSubscriptionStatus();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subscribed) {
      // Resync mit Server im Hintergrund (erneuert das Abo automatisch,
      // falls sich der Server-VAPID-Schlüssel seither geändert hat).
      subscribeToPushNotifications().catch(() => {});
    }
  }, [subscribed]);

  // Sobald aktiviert, verschwindet die Banner komplett statt dauerhaft Platz
  // zu belegen - der Status ist danach im Hamburger-Menü zu finden (dort
  // nutzt derselbe usePushSubscriptionStatus-Hook denselben Live-Stand).
  if (!supported || subscribed) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        await modal.alert({ title: 'Hinweis', message: 'Benachrichtigungen wurden im Browser nicht erlaubt. Bitte berechtige die App in den Einstellungen.' });
        setLoading(false);
        return;
      }
      const ok = await subscribeToPushNotifications();
      if (!ok) {
        await modal.alert({ title: 'Fehler', message: 'Konnte Push-Benachrichtigungen nicht aktivieren.' });
        return;
      }
      setSubscribed(true);
      await modal.alert({ title: 'Aktiviert 🎉', message: 'Du wirst nun bei Schicht-Änderungen sofort per Push auf diesem Gerät informiert!' });
    } catch (err: any) {
      console.error('Push Abo Fehler:', err);
      await modal.alert({ title: 'Fehler', message: 'Konnte Push-Benachrichtigungen nicht aktivieren.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 22 }}>🔔</span>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 14, color: '#856404' }}>Schicht-Updates per PWA Push</div>
          <div style={{ fontSize: 12, color: '#856404', opacity: 0.9 }}>Keine E-Mails – lass dich direkt in deiner PWA benachrichtigen.</div>
        </div>
      </div>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        style={{ background: primaryColor, color: textColor, border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: loading ? 'wait' : 'pointer' }}
      >
        {loading ? 'Aktivieren...' : 'Auf diesem Gerät aktivieren'}
      </button>
    </div>
  );
}
