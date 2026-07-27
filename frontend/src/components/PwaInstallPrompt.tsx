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
      <div id="tour-pwa-install" style={{ background: '#e8f5e9', padding: '12px 16px', borderRadius: 8, border: '1px solid #198754', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', color: '#198754', fontSize: 14 }}>App installieren</div>
            <div style={{ fontSize: 12, color: '#2e7d32' }}>Installiere "Mach das Turnier!" für Push-Benachrichtigungen und schnellen Zugriff.</div>
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
      <div id="tour-pwa-install" style={{ background: '#e8f5e9', padding: '16px', borderRadius: 12, border: '1px solid #198754', marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <style>
          {`
            @keyframes bounceDown {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(6px); }
            }
          `}
        </style>
        <button 
          onClick={() => setIsDismissed(true)}
          style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(25, 135, 84, 0.1)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', fontSize: 18, cursor: 'pointer', color: '#198754' }}>
          ×
        </button>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ background: '#198754', color: '#fff', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'bounceDown 1.5s infinite' }}>
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 'bold', color: '#198754', fontSize: 16, marginBottom: 4, paddingRight: 24 }}>App installieren (iOS)</div>
            <div style={{ fontSize: 13, color: '#2e7d32', lineHeight: 1.5 }}>
              Tippe unten in der Leiste auf das <strong style={{ color: '#198754' }}>Teilen-Symbol</strong> <span style={{display: 'inline-block', verticalAlign: 'middle', border: '1px solid #198754', padding: '2px 4px', borderRadius: 4, margin: '0 2px'}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg></span> und wähle <strong style={{ color: '#198754' }}>"Zum Home-Bildschirm"</strong> <span><svg style={{display: 'inline-block', verticalAlign: 'middle'}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg></span> aus, um Push-Benachrichtigungen zu erhalten.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
