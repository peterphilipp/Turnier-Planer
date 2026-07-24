import { useState, useEffect } from 'react';

// Erweitern des globalen Window-Objekts um die spezifischen PWA-Events
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Prüfen, ob die App bereits installiert ist
    const checkStandalone = () => {
      const isStandalonePwa = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as any).standalone === true;
      setIsStandalone(isStandalonePwa);
    };

    checkStandalone();

    // Event für Android / Desktop
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // iOS Safari Erkennung
    const ua = window.navigator.userAgent;
    const webkit = !!ua.match(/WebKit/i);
    const isIOSDevice = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i) || !!ua.match(/iPod/i);
    setIsIOS(isIOSDevice && webkit && !ua.match(/CriOS/i));

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone || isDismissed) {
    return null;
  }

  // Wenn ein aktiver Install-Prompt (Android/Desktop) da ist
  if (deferredPrompt) {
    return (
      <div style={{ background: '#e8f5e9', padding: '12px 16px', borderRadius: 8, border: '1px solid #198754', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: '#198754', fontSize: 14 }}>App installieren</div>
            <div style={{ fontSize: 12, color: '#2e7d32' }}>Installiere den TSV Holm Planer für Push-Benachrichtigungen und schnellen Zugriff.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={async () => {
              if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                  setDeferredPrompt(null);
                }
              }
            }}
            style={{ flex: 1, background: '#198754', color: '#fff', border: 'none', borderRadius: 6, padding: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: 13 }}>
            Jetzt installieren
          </button>
          <button 
            onClick={() => setIsDismissed(true)}
            style={{ background: 'transparent', color: '#198754', border: '1px solid #198754', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>
            Später
          </button>
        </div>
      </div>
    );
  }

  // Fallback für iOS (da Apple kein vorinstalliertes Event auslöst)
  if (isIOS) {
    return (
      <div style={{ background: '#e8f5e9', padding: '12px 16px', borderRadius: 8, border: '1px solid #198754', marginBottom: 16, position: 'relative' }}>
        <button 
          onClick={() => setIsDismissed(true)}
          style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#198754' }}>
          ×
        </button>
        <div style={{ fontWeight: 'bold', color: '#198754', fontSize: 14, marginBottom: 4 }}>App auf dem iPhone installieren</div>
        <div style={{ fontSize: 12, color: '#2e7d32', paddingRight: 16 }}>
          Tippe unten auf das <strong>Teilen-Symbol</strong> (Viereck mit Pfeil nach oben) und wähle <strong>"Zum Home-Bildschirm"</strong>, um Push-Nachrichten zu erhalten.
        </div>
      </div>
    );
  }

  return null;
}
