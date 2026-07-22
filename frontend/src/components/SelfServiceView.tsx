import { useState, useEffect } from 'react';

interface Shift {
  id: number; date: string; slot: string;
  zeitslot: { name: string; startTime: string; endTime: string; color: string } | null;
  arbeitsbereich: { name: string; icon: string; color: string } | null;
  arbeitsbereichId: number | null;
  maxVolunteers: number;
}
interface VolunteerShift { id: number; volunteerId: number; date: string; slot: string; role: string; areaId: string | null; shiftId: number | null; shift: { id: number; date: string; slot: string; zeitslot: { name: string; startTime: string; endTime: string; color: string } | null; arbeitsbereich: { name: string; icon: string; color: string } | null; arbeitsbereichId: number | null; maxVolunteers: number; } | null; }
interface Volunteer { id: number; name: string; email: string | null; phone: string | null; childName: string | null; childYear: number | null; }
interface Club { id: number; name: string; logo: string | null; primaryColor: string; secondaryColor: string; accentColor: string; }
interface FoodCategory { id: number; name: string; icon: string; items: { id: number; name: string; price: string | null; unit: string }[]; }
interface FoodDonation { id: number; foodItemId: number; quantity: number; note: string | null; createdAt: string; foodItem: { id: number; name: string; unit: string; category: { id: number; name: string; icon: string } } | null; }

export default function SelfServiceView() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
  const [token, setToken] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [volunteerShifts, setVolunteerShifts] = useState<VolunteerShift[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regChildName, setRegChildName] = useState('');
  const [regChildYear, setRegChildYear] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editChildName, setEditChildName] = useState('');
  const [editChildYear, setEditChildYear] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetNewPasswordConfirm, setResetNewPasswordConfirm] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [clubPrimary, setClubPrimary] = useState('#0d6efd');
  const [clubSecondary, setClubSecondary] = useState('#6c757d');
  const [clubAccent, setClubAccent] = useState('#198754');
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [tournamentName, setTournamentName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'schichten' | 'spenden'>('schichten');
  const [foodCategories, setFoodCategories] = useState<FoodCategory[]>([]);
  const [myDonations, setMyDonations] = useState<FoodDonation[]>([]);
  const [donationFoodId, setDonationFoodId] = useState(0);
  const [donationQuantity, setDonationQuantity] = useState('');
  const [donationNote, setDonationNote] = useState('');

  useEffect(() => {
    // Reset-Token aus URL auslesen
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setResetToken(tokenParam);
      setShowResetPassword(true);
      return;
    }

    const savedToken = localStorage.getItem('token');
    const savedVolunteer = localStorage.getItem('volunteer');
    console.log('useEffect - savedToken:', !!savedToken, 'savedVolunteer:', savedVolunteer);
    if (savedToken && savedVolunteer) {
      setToken(savedToken);
      const vol = JSON.parse(savedVolunteer);
      setVolunteer(vol);
      setIsLoggedIn(true);
      console.log('Auto-login volunteer:', vol);
      if (vol?.tournamentId) {
        console.log('Auto-fetching club colors for tournamentId:', vol.tournamentId);
        fetchClubColors(vol.tournamentId);
      }
      fetch('/api/self/available', { headers: { Authorization: 'Bearer ' + savedToken } })
        .then(r => r.ok ? r.json() : Promise.resolve(null))
        .then(d => { if (d) { setShifts(d.shifts); setVolunteerShifts(d.volunteerShifts); } })
        .catch(() => {});
    }
  }, []);

  const fetchClubColors = async (tournamentId: number) => {
    try {
      console.log('fetchClubColors called for tournamentId:', tournamentId);
      const res = await fetch('/api/tournaments/' + tournamentId);
      console.log('fetchClubColors response status:', res.status);
      if (res.ok) {
        const t = await res.json();
        console.log('Club data:', t?.club);
        if (t?.club) {
          setClubPrimary(t.club.primaryColor || '#0d6efd');
          setClubSecondary(t.club.secondaryColor || '#6c757d');
          setClubAccent(t.club.accentColor || '#198754');
          setClubLogo(t.club.logo || null);
        }
        if (t?.name) setTournamentName(t.name);
      }
    } catch (e) {
      console.error('fetchClubColors error:', e);
    }
  };

  const login = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (!res.ok) { const err = await res.json(); alert(err.error); return; }
      const data = await res.json();
      setToken(data.token);
      setVolunteer(data.volunteer);
      setIsLoggedIn(true);
      localStorage.setItem('token', data.token);
      localStorage.setItem('volunteer', JSON.stringify(data.volunteer));
      console.log('Login volunteer:', data.volunteer);
      setLoginEmail('');
      setLoginPassword('');
      if (data.volunteer?.tournamentId) {
        console.log('Setting tournamentId:', data.volunteer.tournamentId);
        fetchClubColors(data.volunteer.tournamentId);
      }
      const res2 = await fetch('/api/self/available', { headers: { Authorization: 'Bearer ' + data.token } });
      if (res2.ok) { const data2 = await res2.json(); setShifts(data2.shifts); setVolunteerShifts(data2.volunteerShifts); }
    } catch { alert('Login fehlgeschlagen'); }
  };

  const logout = () => {
    setIsLoggedIn(false); setToken(''); setVolunteer(null); setShifts([]); setVolunteerShifts([]);
    localStorage.removeItem('token'); localStorage.removeItem('volunteer');
  };

  const loadAvailable = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/self/available', { headers: { Authorization: 'Bearer ' + token } });
      if (res.ok) { const data = await res.json(); setShifts(data.shifts); setVolunteerShifts(data.volunteerShifts); }
    } finally { setBusy(false); }
  };

  const assign = async (shiftId: number, date: string) => {
    try {
      const res = await fetch('/api/self/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ shiftId, date }),
      });
      if (res.ok) { await loadAvailable(); alert('Zugewiesen!'); }
      else { const err = await res.json(); alert(err.error); }
    } catch { alert('Fehler bei der Zuweisung'); }
  };

  const unassign = async (id: number) => {
    if (!confirm('Schicht abmelden?')) return;
    try {
      const res = await fetch('/api/self/unassign/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
      if (res.ok) { await loadAvailable(); alert('Abgemeldet!'); }
    } catch { alert('Fehler bei der Abmeldung'); }
  };

  const loadFood = async () => {
    try {
      const [cats, dons] = await Promise.all([
        fetch('/api/food/categories').then(r => r.json()).catch(() => []),
        fetch('/api/food/donations', { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()).catch(() => ({ donations: [] }))
      ]);
      setFoodCategories(cats);
      setMyDonations(dons.donations || []);
    } catch {}
  };

  const submitDonation = async () => {
    if (!donationFoodId || !donationQuantity) return alert('Artikel und Menge auswaehlen!');
    try {
      const res = await fetch('/api/food/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ foodItemId: donationFoodId, quantity: parseInt(donationQuantity), note: donationNote || null }),
      });
      if (res.ok) {
        alert('Spende eingetragen!');
        setDonationFoodId(0);
        setDonationQuantity('');
        setDonationNote('');
        await loadFood();
      } else {
        const err = await res.json();
        alert(err.error || 'Fehler');
      }
    } catch { alert('Fehler beim Eintragen'); }
  };

  const cancelDonation = async (id: number) => {
    if (!confirm('Spende loeschen?')) return;
    try {
      const res = await fetch('/api/food/donations/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
      if (res.ok) { alert('Geloescht!'); await loadFood(); }
    } catch { alert('Fehler'); }
  };

  const changePassword = async () => {
    if (!currentPassword || !newPassword) { alert('Bitte beide Felder ausfuellen'); return; }
    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) { alert('Passwort geaendert!'); setMenuOpen(false); setCurrentPassword(''); setNewPassword(''); }
      else { const err = await res.json(); alert(err.error); }
    } catch { alert('Fehler bei der Passwort-Aenderung'); }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const shadeColor = (color: string, percent: number) => {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);
    R = Math.max(0, Math.min(255, R + Math.round(R * percent / 100)));
    G = Math.max(0, Math.min(255, G + Math.round(G * percent / 100)));
    B = Math.max(0, Math.min(255, B + Math.round(B * percent / 100)));
    return '#' + (R.toString(16).padStart(2, '0')) + (G.toString(16).padStart(2, '0')) + (B.toString(16).padStart(2, '0'));
  };

  /* ===== RESET PASSWORD SCREEN ===== */
  if (showResetPassword) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? 20 : 40, background: 'linear-gradient(135deg, ' + clubAccent + ' 0%, ' + shadeColor(clubAccent, -30) + ' 100%)', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 24 : 40, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: isMobile ? 48 : 64, marginBottom: 8 }}>🔑</div>
            <h2 style={{ margin: 0, color: '#333' }}>Neues Passwort festlegen</h2>
            <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Gib dein neues Passwort ein</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="password" placeholder="Neues Passwort" value={resetNewPassword} onChange={e => setResetNewPassword(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="password" placeholder="Passwort bestaetigen" value={resetNewPasswordConfirm} onChange={e => setResetNewPasswordConfirm(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={async () => {
              if (resetNewPassword.length < 6) { alert('Passwort muss mindestens 6 Zeichen haben'); return; }
              if (resetNewPassword !== resetNewPasswordConfirm) { alert('Passwoerter stimmen nicht ueberein'); return; }
              try {
                const res = await fetch('/api/auth/reset-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token: resetToken, newPassword: resetNewPassword }),
                });
                const data = await res.json();
                if (res.ok) {
                  alert('Passwort erfolgreich zurueckgesetzt! Du kannst dich jetzt anmelden.');
                  setShowResetPassword(false);
                } else {
                  alert(data.error || 'Fehler beim Zuruecksetzen');
                }
              } catch { alert('Fehler beim Zuruecksetzen'); }
            }} style={{ padding: '16px', background: clubAccent, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 17, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>Passwort zuruecksetzen</button>
            <button onClick={() => setShowResetPassword(false)} style={{ padding: '14px', background: 'transparent', border: '2px solid #6c757d', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 15, color: '#6c757d' }}>Zurueck</button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== FORGOT PASSWORD SCREEN ===== */
  if (!isLoggedIn && showForgotPassword) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? 20 : 40, background: 'linear-gradient(135deg, ' + shadeColor(clubPrimary, 30) + ' 0%, ' + clubPrimary + ' 100%)', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 24 : 40, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: isMobile ? 48 : 64, marginBottom: 8 }}>📧</div>
            <h2 style={{ margin: 0, color: '#333' }}>Passwort vergessen?</h2>
            <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Gib deine Email ein und wir senden dir einen Link zum Zuruecksetzen</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="email" placeholder="Email-Adresse" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            {forgotMessage && <div style={{ padding: '12px 16px', background: '#d1e7dd', borderRadius: 10, fontSize: 14, color: '#0f5132', whiteSpace: 'pre-line' }}>{forgotMessage}</div>}
            <button onClick={async () => {
              if (!forgotEmail) { alert('Bitte Email eingeben'); return; }
              setForgotMessage('');
              try {
                const res = await fetch('/api/auth/forgot-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: forgotEmail }),
                });
                const data = await res.json();
                if (res.ok) {
                  setForgotMessage(data.message + '\n\n(Hinweis: In der Entwicklungsumgebung wurde der Link im Server-Log ausgegeben.)');
                  setTimeout(() => setShowForgotPassword(false), 5000);
                } else {
                  alert(data.error);
                }
              } catch { alert('Fehler beim Senden'); }
            }} style={{ padding: '16px', background: clubPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 17, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>Link senden</button>
            <button onClick={() => setShowForgotPassword(false)} style={{ padding: '14px', background: 'transparent', border: '2px solid #6c757d', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 15, color: '#6c757d' }}>Zurueck zum Login</button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== LOGIN SCREEN ===== */
  if (!isLoggedIn && !showRegisterForm && !showForgotPassword) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? 20 : 40, background: 'linear-gradient(135deg, ' + clubPrimary + ' 0%, ' + shadeColor(clubPrimary, -30) + ' 100%)', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 24 : 40, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            {clubLogo ? (
              <img src={clubLogo} alt="Verein" style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'contain', marginBottom: 12, padding: 8, background: '#f8f9fa' }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: 16, background: clubPrimary, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 32 }}>
                {(tournamentName || 'TSV')[0]}
              </div>
            )}
            <h2 style={{ margin: 0, color: '#333', fontSize: 22 }}>{tournamentName || 'Turnierplaner'}</h2>
            <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Helfer-Dienstplan</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="email" placeholder="Email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} autoFocus />
            <input type="password" placeholder="Passwort" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') login(); }} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={login} style={{ padding: '16px', background: clubPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 17, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>Anmelden</button>
            <button onClick={() => setShowForgotPassword(true)} style={{ padding: '12px', background: 'transparent', color: clubSecondary, border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '500', fontSize: 14, textDecoration: 'underline' }}>Passwort vergessen?</button>
            <button onClick={() => setShowRegisterForm(true)} style={{ padding: '14px', background: 'transparent', color: clubPrimary, border: '2px solid ' + clubPrimary, borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 15 }}>Registrieren</button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== REGISTER SCREEN ===== */
  if (showRegisterForm) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? 20 : 40, background: 'linear-gradient(135deg, ' + shadeColor(clubPrimary, 30) + ' 0%, ' + clubPrimary + ' 100%)', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 24 : 40, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: isMobile ? 48 : 64, marginBottom: 8 }}>📝</div>
            <h2 style={{ margin: 0, color: '#333' }}>Neue Registrierung</h2>
            <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Erstelle deinen Helfer-Account</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" placeholder="Vor- und Nachname" value={regName} onChange={e => setRegName(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="email" placeholder="Email-Adresse" value={regEmail} onChange={e => setRegEmail(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="tel" placeholder="Handynummer (optional)" value={regPhone} onChange={e => setRegPhone(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="text" placeholder="Name des Kindes (optional)" value={regChildName} onChange={e => setRegChildName(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="number" placeholder="Jahrgang (optional)" value={regChildYear} onChange={e => setRegChildYear(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="password" placeholder="Passwort" value={regPassword} onChange={e => setRegPassword(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="password" placeholder="Passwort bestaetigen" value={regPasswordConfirm} onChange={e => setRegPasswordConfirm(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={async () => {
              if (!regName || !regEmail || !regPassword) { alert('Bitte alle Pflichtfelder ausfuellen'); return; }
              if (regPassword !== regPasswordConfirm) { alert('Passwoerter stimmen nicht ueberein'); return; }
              if (regPassword.length < 6) { alert('Passwort muss mindestens 6 Zeichen haben'); return; }
              try {
                const res = await fetch('/api/auth/register', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: regName, email: regEmail, phone: regPhone || null, password: regPassword, childName: regChildName || null, childYear: regChildYear ? parseInt(regChildYear) : null }),
                });
                if (res.ok) {
                  const data = await res.json();
                  setToken(data.token); setVolunteer(data.volunteer); setIsLoggedIn(true);
                  localStorage.setItem('token', data.token); localStorage.setItem('volunteer', JSON.stringify(data.volunteer));
                  setShowRegisterForm(false);
                  setRegName(''); setRegEmail(''); setRegPhone(''); setRegPassword(''); setRegPasswordConfirm('');
                  alert('Registrierung erfolgreich!');
                  const res2 = await fetch('/api/self/available', { headers: { Authorization: 'Bearer ' + data.token } });
                  if (res2.ok) { const d = await res2.json(); setShifts(d.shifts); setVolunteerShifts(d.volunteerShifts); }
                } else { const err = await res.json(); alert(err.error); }
              } catch { alert('Fehler bei der Registrierung'); }
            }} style={{ padding: '16px', background: clubAccent, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 17, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>Registrieren</button>
            <button onClick={() => setShowRegisterForm(false)} style={{ padding: '14px', background: 'transparent', border: '2px solid #6c757d', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 15, color: '#6c757d' }}>Zurueck zum Login</button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== PROFIL BEARBEITEN ===== */
  if (showProfile) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: isMobile ? 20 : 40, background: 'linear-gradient(135deg, ' + shadeColor(clubPrimary, 30) + ' 0%, ' + clubPrimary + ' 100%)', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: isMobile ? 24 : 40, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: isMobile ? 48 : 64, marginBottom: 8 }}>👤</div>
            <h2 style={{ margin: 0, color: '#333' }}>Profil bearbeiten</h2>
            <p style={{ color: '#666', fontSize: 14, marginTop: 4 }}>Ändere deine Daten</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" placeholder="Vor- und Nachname" value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="email" placeholder="Email-Adresse" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="tel" placeholder="Handynummer" value={editPhone} onChange={e => setEditPhone(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="text" placeholder="Name des Kindes (optional)" value={editChildName} onChange={e => setEditChildName(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="number" placeholder="Jahrgang (optional)" value={editChildYear} onChange={e => setEditChildYear(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={async () => {
              try {
                const res = await fetch('/api/auth/profile', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                  body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone, childName: editChildName || null, childYear: editChildYear ? parseInt(editChildYear) : null }),
                });
                if (res.ok) {
                  const data = await res.json();
                  setVolunteer(data);
                  localStorage.setItem('volunteer', JSON.stringify(data));
                  setShowProfile(false);
                  alert('Profil aktualisiert!');
                } else {
                  const err = await res.json();
                  alert(err.error);
                }
              } catch { alert('Fehler beim Aktualisieren'); }
            }} style={{ padding: '16px', background: clubPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 17, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>Speichern</button>
            <button onClick={() => setShowProfile(false)} style={{ padding: '14px', background: 'transparent', border: '2px solid #6c757d', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 15, color: '#6c757d' }}>Abbrechen</button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== DASHBOARD ===== */
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto', padding: isMobile ? 16 : 24, background: '#f0f2f5', minHeight: '100vh', boxSizing: 'border-box' }}>
      {/* Header mit Logo, Name & Hamburger */}
      <div style={{ background: 'linear-gradient(135deg, ' + clubPrimary + ' 0%, ' + shadeColor(clubPrimary, -20) + ' 100%)', borderRadius: 16, padding: isMobile ? 16 : 20, marginBottom: 20, color: '#fff', position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)', width: 44, height: 44,
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10,
            cursor: 'pointer', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 4
          }}
        >
          <span style={{ display: 'block', width: 22, height: 2.5, background: '#fff', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span style={{ display: 'block', width: 22, height: 2.5, background: '#fff', borderRadius: 2, transition: 'all 0.2s', opacity: menuOpen ? 0 : 1 }} />
          <span style={{ display: 'block', width: 22, height: 2.5, background: '#fff', borderRadius: 2, transition: 'all 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>

        {/* Hamburger Menü */}
        {menuOpen && (
          <div style={{ position: 'absolute', top: 56, right: 12, background: '#fff', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.2)', padding: 8, zIndex: 100, minWidth: 200, color: '#333' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e9ecef', marginBottom: 8 }}>
              <div style={{ fontWeight: 'bold', fontSize: 15 }}>{volunteer?.name}</div>
              <div style={{ fontSize: 12, color: '#999' }}>{volunteer?.email || ''}</div>
            </div>
            <button onClick={() => {
              setMenuOpen(false);
              setShowProfile(true);
              setEditName(volunteer?.name || '');
              setEditEmail(volunteer?.email || '');
              setEditPhone(volunteer?.phone || '');
              setEditChildName(volunteer?.childName || '');
              setEditChildYear(volunteer?.childYear ? String(volunteer.childYear) : '');
            }} style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#333' }}>👤 Profil bearbeiten</button>
            <button onClick={() => {
              setMenuOpen(false);
              const pw = prompt('Neues Passwort:');
              if (pw && pw.length >= 6) {
                const cp = prompt('Aktuelles Passwort:');
                if (cp) {
                  fetch('/api/auth/password', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                    body: JSON.stringify({ currentPassword: cp, newPassword: pw }),
                  }).then(r => r.json()).then(d => {
                    if (d.error) alert(d.error); else alert('Passwort geaendert!');
                  });
                }
              }
            }} style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#333' }}>🔑 Passwort ändern</button>
            <button onClick={() => { setMenuOpen(false); setShowRegisterForm(false); logout(); }} style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#dc3545' }}>🚪 Abmelden</button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {clubLogo ? (
            <img src={clubLogo} alt={tournamentName} style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'contain', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0, padding: 4, background: '#fff' }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 22, flexShrink: 0, padding: 6 }}>
              {(tournamentName || 'TSV')[0]}
            </div>
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22 }}>{tournamentName || 'Turnier'}</h2>
            <p style={{ margin: '2px 0 0', opacity: 0.85, fontSize: 13 }}>Hallo, {volunteer?.name}!</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 16 }}>
        <select value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ width: '100%', padding: '12px 14px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
          <option value="">Alle Daten</option>
          {Array.from(new Set(shifts.map(s => new Date(s.date).toLocaleDateString('de-DE')))).sort().map(d => (<option key={d} value={d}>{d}</option>))}
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setActiveSection('schichten')} style={{ flex: 1, padding: '12px 0', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: activeSection === 'schichten' ? '600' : '400', background: activeSection === 'schichten' ? clubSecondary : '#fff', color: activeSection === 'schichten' ? '#fff' : '#666', boxShadow: activeSection === 'schichten' ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.08)' }}>📋 Schichten</button>
        <button onClick={() => { setActiveSection('spenden'); loadFood(); }} style={{ flex: 1, padding: '12px 0', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: activeSection === 'spenden' ? '600' : '400', background: activeSection === 'spenden' ? clubSecondary : '#fff', color: activeSection === 'spenden' ? '#fff' : '#666', boxShadow: activeSection === 'spenden' ? '0 2px 8px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.08)' }}>🍞 Spenden</button>
      </div>

      {/* Deine Schichten */}
      {activeSection === 'schichten' && volunteerShifts.filter(vs => vs.volunteerId === volunteer?.id).length > 0 && (
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, color: clubPrimary }}>Deine Schichten ({volunteerShifts.filter(vs => vs.volunteerId === volunteer?.id).length})</h3>
          {volunteerShifts
            .filter(vs => vs.volunteerId === volunteer?.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((vs, idx, myShifts) => {
              const s = vs.shift;
              const dateStr = new Date(vs.date).toISOString().split('T')[0];
              const prevVs = idx > 0 ? myShifts[idx - 1] : null;
              const showDayHeader = !prevVs || new Date(prevVs.date).toDateString() !== new Date(vs.date).toDateString();
              const assignedCount = volunteerShifts.filter(v => v.shiftId === s?.id).length;
              const remaining = (s?.maxVolunteers || 0) - assignedCount;
              return (
                <div key={vs.id}>
                  {showDayHeader && (
                    <div style={{ fontSize: 13, fontWeight: 'bold', color: clubPrimary, padding: '6px 0', marginTop: idx > 0 ? 8 : 0, borderTop: '1px solid #e9ecef' }}>
                      {new Date(vs.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                  <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderLeft: '4px solid ' + clubAccent }}>
                    <div style={{ minWidth: 140 }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{s?.arbeitsbereich?.icon || '📍'}</div>
                      <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>{s?.arbeitsbereich?.name || '–'}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#666', marginBottom: 2 }}>{new Date(vs.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</div>
                      {s?.zeitslot && <div style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{s.zeitslot.startTime} - {s.zeitslot.endTime}</div>}
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 70 }}>
                      <div style={{ fontSize: 18, fontWeight: 'bold', color: remaining > 0 ? clubAccent : '#6c757d' }}>{remaining}/{s?.maxVolunteers || 0}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>frei</div>
                    </div>
                    <div>
                      <button onClick={() => unassign(vs.id)} title="Abmelden" style={{ width: 44, height: 44, borderRadius: 10, border: 'none', background: clubSecondary, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 7v6h6" />
                          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Offene Schichten */}
      {busy && <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>Lade Schichten...</div>}

      {!busy && shifts.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 12, color: '#666' }}>Keine Schichten verfügbar.</div>
      )}

      {!busy && shifts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: 16, color: clubPrimary }}>Offene Schichten</h3>
          {shifts
            .filter(s => !filterDate || new Date(s.date).toLocaleDateString('de-DE') === filterDate)
            .filter(s => {
              if (!token) return true;
              return !volunteerShifts.some(vs => vs.shiftId === s.id);
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((slot, idx) => {
              const prevSlot = idx > 0 ? shifts[idx - 1] : null;
              const showDayHeader = !prevSlot || new Date(prevSlot.date).toDateString() !== new Date(slot.date).toDateString();
              const dateStr = new Date(slot.date).toISOString().split('T')[0];
              const assigned = volunteerShifts.some(vs => vs.shiftId === slot.id);
              const myShift = volunteerShifts.find(vs => vs.shiftId === slot.id);
              const assignedCount = volunteerShifts.filter(vs => vs.shiftId === slot.id).length;
              const remaining = slot.maxVolunteers - assignedCount;

              return (
                <div key={slot.id}>
                  {showDayHeader && (
                    <div style={{ fontSize: 13, fontWeight: 'bold', color: clubPrimary, padding: '6px 0', marginTop: idx > 0 ? 8 : 0, borderTop: '1px solid #e9ecef' }}>
                      {new Date(slot.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                    </div>
                  )}
                  <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                    <div style={{ minWidth: 140 }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{slot.arbeitsbereich?.icon || '📍'}</div>
                      <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>{slot.arbeitsbereich?.name || '–'}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: '#666', marginBottom: 2 }}>{new Date(slot.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</div>
                      {slot.zeitslot && <div style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{slot.zeitslot.startTime} - {slot.zeitslot.endTime}</div>}
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 70 }}>
                      <div style={{ fontSize: 18, fontWeight: 'bold', color: remaining > 0 ? clubAccent : '#6c757d' }}>{remaining}/{slot.maxVolunteers}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>frei</div>
                    </div>
                    <div>
                      {assigned ? (
                        <button onClick={() => unassign(myShift!.id)} title="Abmelden" style={{ width: 44, height: 44, borderRadius: 10, border: 'none', background: clubSecondary, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 7v6h6" />
                            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                          </svg>
                        </button>
                      ) : remaining > 0 ? (
                        <button onClick={() => assign(slot.id, dateStr)} title="Zuweisen" style={{ width: 44, height: 44, borderRadius: 10, border: 'none', background: clubSecondary, color: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                          <span style={{ color: '#fff', lineHeight: 1, fontWeight: 'bold' }}>+</span>
                        </button>
                      ) : (
                        <span style={{ width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e9ecef', color: '#adb5bd', fontSize: 22 }}>✖</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Lebensmittel Spenden */}
      {activeSection === 'spenden' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Spenden Formular */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: '600', color: clubPrimary }}>🍞 Neue Spende</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select value={donationFoodId} onChange={e => setDonationFoodId(parseInt(e.target.value))} style={{ padding: '12px 14px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 15, outline: 'none', background: '#fff' }}>
                <option value={0}>-- Artikel auswählen --</option>
                {foodCategories.map(cat => (
                  <optgroup key={cat.id} label={`${cat.icon} ${cat.name}`}>
                    {cat.items.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 12 }}>
                <input value={donationQuantity} onChange={e => setDonationQuantity(e.target.value)} placeholder="Menge" type="number" min="1" style={{ flex: 1, padding: '12px 14px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
                <input value={donationNote} onChange={e => setDonationNote(e.target.value)} placeholder="Notiz (optional)" style={{ flex: 1, padding: '12px 14px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button onClick={submitDonation} style={{ padding: '14px 0', background: clubSecondary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>📦 Spende eintragen</button>
            </div>
          </div>

          {/* Meine Spenden */}
          {myDonations.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: '600', color: clubPrimary }}>📌 Meine Spenden ({myDonations.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myDonations.map(d => (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f8f9fa', borderRadius: 10 }}>
                    <div style={{ fontSize: 24 }}>{d.foodItem?.category?.icon || '🍽️'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: 14, color: '#333' }}>{d.foodItem?.name || '–'}</div>
                      <div style={{ fontSize: 12, color: '#999' }}>{d.quantity} {d.foodItem?.unit} · {new Date(d.createdAt).toLocaleDateString('de-DE')}</div>
                      {d.note && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>📝 {d.note}</div>}
                    </div>
                    <button onClick={() => cancelDonation(d.id)} title="Löschen" style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: '#fde8e8', color: '#dc3545', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Menü schließen beim Klick außerhalb */}
      {menuOpen && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }} onClick={() => setMenuOpen(false)} />}
    </div>
  );
}
