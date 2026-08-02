import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiPost } from '../../api';
import { modal } from '../admin/Modal';

function shadeColor(color: string | undefined, percent: number) {
  if (!color || typeof color !== 'string' || !color.startsWith('#')) {
    return color || '';
  }
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);
  R = Math.floor(R * (100 + percent) / 100);
  G = Math.floor(G * (100 + percent) / 100);
  B = Math.floor(B * (100 + percent) / 100);
  R = (R < 255) ? R : 255;
  G = (G < 255) ? G : 255;
  B = (B < 255) ? B : 255;
  const RR = ((R.toString(16).length === 1) ? '0' + R.toString(16) : R.toString(16));
  const GG = ((G.toString(16).length === 1) ? '0' + G.toString(16) : G.toString(16));
  const BB = ((B.toString(16).length === 1) ? '0' + B.toString(16) : B.toString(16));
  return '#' + RR + GG + BB;
}

/**
 * Drei Wege zurueck ins Konto.
 *
 * Bis hierher bot die Oberflaeche nur den E-Mail-Weg an. Wer sich ohne
 * E-Mail registriert hatte - bei Helfern der Regelfall - war nach einem
 * vergessenen Passwort dauerhaft ausgesperrt und auf einen Administrator
 * angewiesen. Die Endpunkte fuer Code und Push gab es im Backend laengst,
 * sie waren nur nirgends verlinkt. Der fruehere Knopf "Code manuell
 * eingeben" fuehrte trotz seiner Beschriftung zum E-Mail-Token, nicht zum
 * Wiederherstellungs-Code.
 */
type Weg = 'email' | 'pin' | 'push';

/** Namensfelder: mobile Tastaturen duerfen die Eingabe nicht veraendern. */
const namensFeldProps = {
  autoCapitalize: 'none' as const,
  autoCorrect: 'off' as const,
  spellCheck: false,
  autoComplete: 'username'
};

export default function PasswordResetView({ clubPrimary: propClubPrimary }: { clubPrimary?: string; clubSecondary?: string; clubAccent?: string; clubLogo?: string | null }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clubPrimary = propClubPrimary || '#0d6efd';

  const tokenParam = searchParams.get('token');
  const [resetToken, setResetToken] = useState(tokenParam || '');
  const [isResetMode, setIsResetMode] = useState(!!tokenParam);

  const [weg, setWeg] = useState<Weg>('email');
  const [busy, setBusy] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  const [pinName, setPinName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [pinPasswort, setPinPasswort] = useState('');
  const [pinPasswortWdh, setPinPasswortWdh] = useState('');
  const [neuerPin, setNeuerPin] = useState<string | null>(null);

  const [pushName, setPushName] = useState('');
  const [pushMessage, setPushMessage] = useState('');

  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetNewPasswordConfirm, setResetNewPasswordConfirm] = useState('');

  useEffect(() => {
    if (tokenParam) {
      setResetToken(tokenParam);
      setIsResetMode(true);
    }
  }, [tokenParam]);

  const requestPasswordReset = async () => {
    if (!forgotEmail) {
      await modal.alert({ title: 'Fehler', message: 'Bitte Email-Adresse eingeben' });
      return;
    }
    setBusy(true);
    try {
      await apiPost('/api/auth/forgot-password', { email: forgotEmail });
      setForgotMessage('Wir haben dir einen Link zum Zurücksetzen gesendet (falls die Email existiert). Bitte prüfe auch deinen Spam-Ordner.');
    } catch (err: unknown) {
      await modal.alert({ title: 'Fehler', message: (err as Error).message || 'Ein Fehler ist aufgetreten' });
    } finally {
      setBusy(false);
    }
  };

  const resetPerPin = async () => {
    if (!pinName.trim() || !pinCode.trim()) {
      await modal.alert({ title: 'Fehlende Angabe', message: 'Bitte Name und Wiederherstellungs-Code eingeben.' });
      return;
    }
    if (pinPasswort.length < 6) {
      await modal.alert({ title: 'Passwort zu kurz', message: 'Das neue Passwort muss mindestens 6 Zeichen haben.' });
      return;
    }
    if (pinPasswort !== pinPasswortWdh) {
      await modal.alert({ title: 'Fehler', message: 'Passwörter stimmen nicht überein' });
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost('/api/auth/reset-by-pin', {
        name: pinName.trim(),
        recoveryPin: pinCode.trim(),
        newPassword: pinPasswort
      });
      // Der Server vergibt bei jeder Nutzung einen NEUEN Code und liefert ihn
      // genau einmal aus - er muss hier zwingend angezeigt werden.
      setNeuerPin(res?.recoveryPin || null);
      if (!res?.recoveryPin) {
        await modal.alert({ title: 'Passwort geändert', message: 'Du kannst dich jetzt mit deinem neuen Passwort anmelden.' });
        navigate('/login');
      }
    } catch (err: unknown) {
      await modal.alert({ title: 'Nicht zurückgesetzt', message: (err as Error).message || 'Name oder Code stimmen nicht.' });
    } finally {
      setBusy(false);
    }
  };

  const resetPerPush = async () => {
    if (!pushName.trim()) {
      await modal.alert({ title: 'Fehlende Angabe', message: 'Bitte deinen Namen eingeben.' });
      return;
    }
    setBusy(true);
    try {
      const res = await apiPost('/api/auth/forgot-password-push', { name: pushName.trim() });
      setPushMessage(res?.message || 'Wenn ein Konto mit registriertem Gerät existiert, wurde eine Benachrichtigung gesendet.');
    } catch (err: unknown) {
      await modal.alert({ title: 'Fehler', message: (err as Error).message || 'Ein Fehler ist aufgetreten' });
    } finally {
      setBusy(false);
    }
  };

  const applyPasswordReset = async () => {
    if (resetNewPassword !== resetNewPasswordConfirm) {
      await modal.alert({ title: 'Fehler', message: 'Passwörter stimmen nicht überein' });
      return;
    }
    setBusy(true);
    try {
      await apiPost('/api/auth/reset-password', { token: resetToken, newPassword: resetNewPassword });
      await modal.alert({ title: 'Erfolg', message: 'Dein Passwort wurde erfolgreich geändert.' });
      navigate('/login');
    } catch (err: unknown) {
      await modal.alert({ title: 'Fehler', message: (err as Error).message || 'Passwort konnte nicht geändert werden' });
    } finally {
      setBusy(false);
    }
  };

  const huelle = (inhalt: React.ReactNode) => (
    <div className="auth-wrapper" style={{ background: `linear-gradient(135deg, ${clubPrimary} 0%, ${shadeColor(clubPrimary, -30)} 100%)` }}>
      <div className="auth-container">
        <div className="auth-card">{inhalt}</div>
      </div>
    </div>
  );

  // --- Neues Passwort setzen (Link aus E-Mail oder Push-Nachricht) ---
  if (isResetMode) {
    return huelle(
      <>
        <div className="auth-header">
          <div className="auth-emoji">🔑</div>
          <h2 className="auth-title">Neues Passwort setzen</h2>
        </div>
        <div className="auth-form">
          <input type="password" placeholder="Neues Passwort" value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} className="input-base" autoComplete="new-password" />
          <input type="password" placeholder="Passwort bestätigen" value={resetNewPasswordConfirm} onChange={e => setResetNewPasswordConfirm(e.target.value)} className="input-base" autoComplete="new-password" />
          <button onClick={applyPasswordReset} disabled={busy} className="btn btn-primary" style={{ marginTop: 12 }}>{busy ? 'Speichert…' : 'Passwort speichern'}</button>
          <button onClick={() => navigate('/login')} className="btn btn-text">Abbrechen</button>
        </div>
      </>
    );
  }

  // --- Nach erfolgreichem Code-Reset: der neue Code MUSS gesichert werden ---
  if (neuerPin) {
    return huelle(
      <>
        <div className="auth-header">
          <div className="auth-emoji">✅</div>
          <h2 className="auth-title">Passwort geändert</h2>
        </div>
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: '#664d03', fontWeight: 600 }}>Dein neuer Wiederherstellungs-Code</p>
          <div style={{ fontFamily: 'monospace', fontSize: 24, letterSpacing: 2, textAlign: 'center', color: '#212529', background: '#fff', borderRadius: 8, padding: '12px 8px', userSelect: 'all' }}>
            {neuerPin}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 13, color: '#664d03', lineHeight: 1.5 }}>
            Bitte notiere ihn. Der alte Code gilt nicht mehr, und dieser hier wird dir kein zweites Mal angezeigt.
          </p>
        </div>
        <button onClick={() => { navigator.clipboard?.writeText(neuerPin).catch(() => {}); }} className="btn btn-outline" style={{ marginBottom: 8 }}>Code kopieren</button>
        <button onClick={() => navigate('/login')} className="btn btn-primary">Jetzt anmelden</button>
      </>
    );
  }

  const wege: { id: Weg; label: string }[] = [
    { id: 'email', label: '✉️ E-Mail' },
    { id: 'pin', label: '🔢 Code' },
    { id: 'push', label: '📱 Gerät' }
  ];

  return huelle(
    <>
      <div className="auth-header">
        <div className="auth-emoji">🔒</div>
        <h2 className="auth-title">Passwort vergessen</h2>
        <p className="auth-subtitle">Wähle, wie du zurück in dein Konto kommst</p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {wege.map(w => (
          <button
            key={w.id}
            onClick={() => { setWeg(w.id); setForgotMessage(''); setPushMessage(''); }}
            style={{
              flex: 1, padding: '10px 4px', minHeight: 44, borderRadius: 10, cursor: 'pointer',
              border: `1px solid ${weg === w.id ? clubPrimary : 'var(--border-color)'}`,
              background: weg === w.id ? clubPrimary : 'var(--bg-surface)',
              color: weg === w.id ? '#fff' : 'var(--text-muted)',
              fontSize: 13, fontWeight: weg === w.id ? 600 : 400
            }}
          >{w.label}</button>
        ))}
      </div>

      {weg === 'email' && (forgotMessage ? (
        <div style={{ background: 'var(--bg-surface-hover)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-md)', color: 'var(--club-accent)', textAlign: 'center', marginBottom: 'var(--spacing-4)', lineHeight: 1.5, border: '1px solid var(--club-accent)' }}>
          {forgotMessage}
        </div>
      ) : (
        <div className="auth-form">
          <p className="auth-subtitle" style={{ marginBottom: 8 }}>Wir senden dir einen Link zum Zurücksetzen.</p>
          <input type="email" placeholder="Email-Adresse" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="input-base" autoComplete="email" />
          <button onClick={requestPasswordReset} disabled={busy} className="btn btn-primary">{busy ? 'Sendet…' : 'Link anfordern'}</button>
          <button
            onClick={() => {
              const t = window.prompt('Code aus der E-Mail eingeben:');
              if (t && t.trim().length > 3) { setResetToken(t.trim()); setIsResetMode(true); }
            }}
            className="btn btn-text"
            style={{ fontSize: 'var(--font-size-xs)' }}
          >Link kam nicht an? Code aus der E-Mail eingeben</button>
        </div>
      ))}

      {weg === 'pin' && (
        <div className="auth-form">
          <p className="auth-subtitle" style={{ marginBottom: 8 }}>
            Den Wiederherstellungs-Code hast du bei der Registrierung erhalten.
          </p>
          <input type="text" placeholder="Dein Name" value={pinName} onChange={e => setPinName(e.target.value)} className="input-base" {...namensFeldProps} />
          <input type="text" placeholder="Wiederherstellungs-Code" value={pinCode} onChange={e => setPinCode(e.target.value.toUpperCase())} className="input-base" autoCapitalize="characters" autoCorrect="off" spellCheck={false} style={{ fontFamily: 'monospace', letterSpacing: 1 }} />
          <input type="password" placeholder="Neues Passwort" value={pinPasswort} onChange={e => setPinPasswort(e.target.value)} className="input-base" autoComplete="new-password" />
          <input type="password" placeholder="Passwort bestätigen" value={pinPasswortWdh} onChange={e => setPinPasswortWdh(e.target.value)} className="input-base" autoComplete="new-password" />
          <button onClick={resetPerPin} disabled={busy} className="btn btn-primary">{busy ? 'Setzt zurück…' : 'Passwort neu setzen'}</button>
        </div>
      )}

      {weg === 'push' && (pushMessage ? (
        <div style={{ background: 'var(--bg-surface-hover)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-md)', color: 'var(--club-accent)', textAlign: 'center', marginBottom: 'var(--spacing-4)', lineHeight: 1.5, border: '1px solid var(--club-accent)' }}>
          {pushMessage}
        </div>
      ) : (
        <div className="auth-form">
          <p className="auth-subtitle" style={{ marginBottom: 8 }}>
            Wir schicken eine Benachrichtigung an dein Handy — vorausgesetzt, du hast dort Benachrichtigungen aktiviert.
          </p>
          <input type="text" placeholder="Dein Name" value={pushName} onChange={e => setPushName(e.target.value)} className="input-base" {...namensFeldProps} />
          <button onClick={resetPerPush} disabled={busy} className="btn btn-primary">{busy ? 'Sendet…' : 'Benachrichtigung senden'}</button>
        </div>
      ))}

      <div style={{ textAlign: 'center', marginTop: 'var(--spacing-4)' }}>
        <button onClick={() => navigate('/login')} className="btn btn-text">Zurück zum Login</button>
      </div>
    </>
  );
}
