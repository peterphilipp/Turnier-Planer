import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { apiPost } from '../../api';
import { modal } from '../admin/Modal';
import { btnStyle, inputStyle } from '../admin/shared';

interface LayoutContext {
  clubPrimary: string;
}

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

export default function PasswordResetView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const context = useOutletContext<LayoutContext>() || {};
  const clubPrimary = context.clubPrimary || '#0d6efd';

  const tokenParam = searchParams.get('token');
  const [resetToken, setResetToken] = useState(tokenParam || '');
  const [isResetMode, setIsResetMode] = useState(!!tokenParam);
  
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  
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
    try {
      await apiPost('/api/auth/forgot-password', { email: forgotEmail });
      setForgotMessage('Wir haben dir einen Link zum Zurücksetzen gesendet (falls die Email existiert). Bitte prüfe auch deinen Spam-Ordner.');
    } catch (err: unknown) {
      const e = err as Error;
      await modal.alert({ title: 'Fehler', message: e.message || 'Ein Fehler ist aufgetreten' });
    }
  };

  const applyPasswordReset = async () => {
    if (resetNewPassword !== resetNewPasswordConfirm) {
      await modal.alert({ title: 'Fehler', message: 'Passwörter stimmen nicht überein' });
      return;
    }
    try {
      await apiPost('/api/auth/reset-password', { token: resetToken, newPassword: resetNewPassword });
      await modal.alert({ title: 'Erfolg', message: 'Dein Passwort wurde erfolgreich geändert.' });
      navigate('/login');
    } catch (err: unknown) {
      const e = err as Error;
      await modal.alert({ title: 'Fehler', message: e.message || 'Passwort konnte nicht geändert werden' });
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isResetMode) {
    return (
      <div className="auth-wrapper" style={{ background: `linear-gradient(135deg, ${clubPrimary} 0%, ${shadeColor(clubPrimary, -30)} 100%)` }}>
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-emoji">🔑</div>
              <h2 className="auth-title">Neues Passwort setzen</h2>
            </div>
            
            <div className="auth-form">
              <input type="password" placeholder="Neues Passwort" value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} className="input-base" />
              <input type="password" placeholder="Passwort bestätigen" value={resetNewPasswordConfirm} onChange={e => setResetNewPasswordConfirm(e.target.value)} className="input-base" />
              <button onClick={applyPasswordReset} className="btn btn-primary" style={{ marginTop: 12 }}>Passwort speichern</button>
              <button onClick={() => navigate('/login')} className="btn btn-text">Abbrechen</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper" style={{ background: `linear-gradient(135deg, ${clubPrimary} 0%, ${shadeColor(clubPrimary, -30)} 100%)` }}>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-emoji">🔒</div>
            <h2 className="auth-title">Passwort vergessen</h2>
            <p className="auth-subtitle">Gib deine Email ein, um es zurückzusetzen</p>
          </div>
          
          {forgotMessage ? (
            <div style={{ background: 'var(--bg-surface-hover)', padding: 'var(--spacing-4)', borderRadius: 'var(--radius-md)', color: 'var(--club-accent)', textAlign: 'center', marginBottom: 'var(--spacing-4)', lineHeight: 1.5, border: '1px solid var(--club-accent)' }}>
              {forgotMessage}
            </div>
          ) : (
            <div className="auth-form">
              <input type="email" placeholder="Email-Adresse" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="input-base" />
              <button onClick={requestPasswordReset} className="btn btn-primary">Zurücksetzen</button>
            </div>
          )}
          
          <div style={{ textAlign: 'center', marginTop: 'var(--spacing-4)' }}>
            <button onClick={() => navigate('/login')} className="btn btn-text">Zurück zum Login</button>
          </div>
          
          {/* Token-Eingabe (Fallback falls Email-Link nicht klappt) */}
          {!forgotMessage && (
            <div style={{ marginTop: 'var(--spacing-6)', paddingTop: 'var(--spacing-4)', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
              <p className="auth-subtitle" style={{ marginBottom: 'var(--spacing-2)' }}>Du hast einen Code/PIN bekommen?</p>
              <button onClick={() => {
                const p = window.prompt("Bitte gib deinen 6-stelligen Code ein:");
                if(p && p.length > 3) {
                  setResetToken(p.trim());
                  setIsResetMode(true);
                }
              }} className="btn btn-outline" style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--spacing-2) var(--spacing-3)', width: 'auto', margin: '0 auto', color: 'var(--text-muted)', borderColor: 'var(--border-color-focus)' }}>
                Code manuell eingeben
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
