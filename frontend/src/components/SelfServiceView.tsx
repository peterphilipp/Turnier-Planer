import { useState, useEffect } from 'react';
import { inputStyle, btnStyle } from './admin/shared';

interface Shift {
  id: number; date: string; slot: string;
  zeitslot: { name: string; startTime: string; endTime: string; color: string } | null;
  arbeitsbereich: { name: string; icon: string; color: string } | null;
  arbeitsbereichId: number | null;
  maxVolunteers: number;
}
interface VolunteerShift { id: number; volunteerId: number; date: string; slot: string; role: string; areaId: string | null; shiftId: number | null; shift: { id: number; date: string; slot: string; zeitslot: { name: string; startTime: string; endTime: string; color: string } | null; arbeitsbereich: { name: string; icon: string; color: string } | null; arbeitsbereichId: number | null; maxVolunteers: number; } | null; }
interface VolunteerChild { id: number; childName: string; childYear: number; }
interface Volunteer { id: number; name: string; email: string | null; phone: string | null; childName: string | null; childYear: number | null; tournamentId: number | null; consentGiven?: boolean; consentDate?: string; children?: VolunteerChild[]; }
interface Club { id: number; name: string; logo: string | null; primaryColor: string; secondaryColor: string; accentColor: string; }
interface FoodCategory { id: number; name: string; icon: string; items: { id: number; name: string; price: string | null; unit: string }[]; }
interface FoodDonation { id: number; foodItemId: number; quantity: number; note: string | null; createdAt: string; foodDonationSlotId: number | null; foodItem: { id: number; name: string; unit: string; category: { id: number; name: string; icon: string } } | null; }
interface FoodDonationSlot { id: number; tournamentId: number; yearGroupId: number | null; yearGroup?: { id: number; name: string; birthYearStart: number; birthYearEnd: number } | null; foodItemId: number | null; targetQuantity: number; collected: number; foodItem: { id: number; name: string; unit: string; icon: string } | null; }

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
  const [regChildren, setRegChildren] = useState<{ childName: string; childYear: string }[]>([{ childName: '', childYear: '' }]);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editChildren, setEditChildren] = useState<{ childName: string; childYear: string }[]>([{ childName: '', childYear: '' }]);
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
  const [foodDonationSlots, setFoodDonationSlots] = useState<FoodDonationSlot[]>([]);
  const [donationFoodId, setDonationFoodId] = useState(0);
  const [donationQuantity, setDonationQuantity] = useState('');
  const [donationNote, setDonationNote] = useState('');
  const [slotCommitments, setSlotCommitments] = useState<Record<number, number>>({});

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
    if (savedToken && savedVolunteer) {
      setToken(savedToken);
      const vol = JSON.parse(savedVolunteer);
      setVolunteer(vol);
      setIsLoggedIn(true);
      if (vol?.tournamentId) {
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
      const res = await fetch('/api/tournaments/' + tournamentId);
      if (res.ok) {
        const t = await res.json();
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
      setLoginEmail('');
      setLoginPassword('');
      if (data.volunteer?.tournamentId) {
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
      
      // Food Donation Slots laden und nach Kinder-Jahrgaengen filtern
      if (volunteer?.tournamentId) {
        const allSlots = await fetch('/api/food-donation-slots?tournamentId=' + volunteer.tournamentId).then(r => r.json()).catch(() => []);
        const childYears = volunteer.children?.map((c: VolunteerChild) => c.childYear) || [];
        const relevantSlots = allSlots.filter((slot: FoodDonationSlot) => {
          if (!slot.yearGroup) return false;
          const yg = slot.yearGroup;
          // Direkt nach yearGroupId matchen
          if (childYears.some(y => y >= yg.birthYearStart && y <= yg.birthYearEnd)) return true;
          if (volunteer.childYear && volunteer.childYear >= yg.birthYearStart && volunteer.childYear <= yg.birthYearEnd) return true;
          // Fallback: alter String-Vergleich
          if (childYears.includes(parseInt(yg.name))) return true;
          return false;
        });
        setFoodDonationSlots(relevantSlots);
      }
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

  const removeCommitment = (slotId: number) => {
    const newCommitments: Record<number, number> = {};
    Object.entries(slotCommitments).forEach(([k, v]) => { if (Number(k) !== slotId) newCommitments[Number(k)] = v; });
    setSlotCommitments(newCommitments);
  };

  const commitSlot = async (slotId: number, foodItemId?: number | null) => {
    if (!foodItemId) return alert('Kein Artikel verfügbar!');
    const qty = slotCommitments[slotId] ?? 0;
    if (qty <= 0) return alert('Bitte Menge eingeben!');
    try {
      const res = await fetch('/api/food/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ foodItemId: Number(foodItemId), quantity: qty, slotId }),
      });
      if (res.ok) {
        alert('Zusage eingetragen!');
        const newCommitments: Record<number, number> = {};
        Object.entries(slotCommitments).forEach(([k, v]) => { if (Number(k) !== slotId) newCommitments[Number(k)] = v; });
        setSlotCommitments(newCommitments);
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
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>Kinder (optional)</div>
              {regChildren.map((child, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Name des Kindes" value={child.childName} onChange={e => { const n = [...regChildren]; n[idx].childName = e.target.value; setRegChildren(n); }} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
                  <input type="number" placeholder="Jg." value={child.childYear} onChange={e => { const n = [...regChildren]; n[idx].childYear = e.target.value; setRegChildren(n); }} style={{ ...inputStyle, width: 70, flexShrink: 0 }} />
                  {regChildren.length > 1 && (
                    <button type="button" onClick={() => { const n = regChildren.filter((_, i) => i !== idx); setRegChildren(n); }} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none', padding: '8px 10px', fontSize: 16, flexShrink: 0 }}>×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setRegChildren([...regChildren, { childName: '', childYear: '' }])} style={{ ...btnStyle, background: '#f8f9fa', border: '1px dashed #adb5bd', color: '#495057', padding: '8px 12px', fontSize: 14, marginTop: 4 }}>➕ Kind hinzufügen</button>
            </div>
            <input type="password" placeholder="Passwort" value={regPassword} onChange={e => setRegPassword(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <input type="password" placeholder="Passwort bestaetigen" value={regPasswordConfirm} onChange={e => setRegPasswordConfirm(e.target.value)} style={{ padding: '14px 16px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 16, outline: 'none', boxSizing: 'border-box' }} />
            <label style={{ display: 'flex', alignItems: 'start', gap: 8, padding: '10px 12px', background: consentGiven ? '#e7f3ff' : '#fff', border: consentGiven ? '2px solid #0d6efd' : '2px solid #e9ecef', borderRadius: 10, cursor: 'pointer', fontSize: 13, color: '#555', lineHeight: 1.4 }}>
              <input type="checkbox" checked={consentGiven} onChange={e => setConsentGiven(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, width: 18, height: 18, cursor: 'pointer' }} />
              <span>
                Ich habe die{' '}
                <a href="?view=privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#0d6efd', textDecoration: 'underline', fontWeight: 'bold' }}>
                  Datenschutzerklärung
                </a>{' '}
                gelesen und stimme der Verarbeitung meiner Daten zu.{' '}
                <span style={{ color: '#dc3545' }}>*</span>
              </span>
            </label>
            <button onClick={async () => {
              if (!regName || !regEmail || !regPassword) { alert('Bitte alle Pflichtfelder ausfuellen'); return; }
              if (regPassword !== regPasswordConfirm) { alert('Passwoerter stimmen nicht ueberein'); return; }
              if (regPassword.length < 6) { alert('Passwort muss mindestens 6 Zeichen haben'); return; }
              if (!consentGiven) { alert('Bitte Datenschutzerklärung akzeptieren'); return; }
              try {
                const res = await fetch('/api/auth/register', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: regName, email: regEmail, phone: regPhone || null, password: regPassword, children: regChildren.filter(c => c.childName || c.childYear).map(c => ({ childName: c.childName || null, childYear: c.childYear ? parseInt(c.childYear) : null })), consentGiven: true }),
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
            }} style={{ padding: '16px', background: clubPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 'bold', fontSize: 17, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>Registrieren</button>
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
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>Kinder</div>
              {editChildren.map((child, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input type="text" placeholder="Name des Kindes" value={child.childName} onChange={e => { const n = [...editChildren]; n[idx].childName = e.target.value; setEditChildren(n); }} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
                  <input type="number" placeholder="Jg." value={child.childYear} onChange={e => { const n = [...editChildren]; n[idx].childYear = e.target.value; setEditChildren(n); }} style={{ ...inputStyle, width: 70, flexShrink: 0 }} />
                  {editChildren.length > 1 && (
                    <button type="button" onClick={() => { const n = editChildren.filter((_, i) => i !== idx); setEditChildren(n); }} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none', padding: '8px 10px', fontSize: 16, flexShrink: 0 }}>×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setEditChildren([...editChildren, { childName: '', childYear: '' }])} style={{ ...btnStyle, background: '#f8f9fa', border: '1px dashed #adb5bd', color: '#495057', padding: '8px 12px', fontSize: 14, marginTop: 4 }}>➕ Kind hinzufügen</button>
            </div>
            {volunteer?.consentGiven && (
              <div style={{ padding: '10px 14px', background: '#e7f3ff', borderRadius: 8, fontSize: 13, color: '#0d6efd' }}>
                ✅ Einwilligung zur Datenverarbeitung erteilt am {volunteer.consentDate ? new Date(volunteer.consentDate).toLocaleDateString('de-DE') : '—'}
              </div>
            )}
            <button onClick={async () => {
              try {
                const res = await fetch('/api/auth/profile', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                  body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone, children: editChildren.filter(c => c.childName || c.childYear).map(c => ({ childName: c.childName || null, childYear: c.childYear ? parseInt(c.childYear) : null })) }),
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
              setEditChildren((volunteer?.children || []).map(c => ({ childName: c.childName, childYear: String(c.childYear) })) || [{ childName: '', childYear: '' }]);
            }} style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#333' }}>👤 Profil bearbeiten</button>
            <button onClick={async () => {
              setMenuOpen(false);
              try {
                const r = await fetch('/api/auth/export', { headers: { Authorization: 'Bearer ' + token } });
                if (!r.ok) { alert('Export fehlgeschlagen'); return; }
                const data = await r.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `turnier-planer-daten-${new Date().toISOString().slice(0,10)}.json`;
                a.click(); URL.revokeObjectURL(url);
              } catch { alert('Export fehlgeschlagen'); }
            }} style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#333' }}>📥 Meine Daten exportieren</button>
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
            <button onClick={async () => {
              setMenuOpen(false);
              if (!confirm('Bist du sicher, dass du deine Einwilligung widerrufen möchtest? Deine Daten werden nicht gelöscht, aber sie können nicht mehr verarbeitet werden.')) return;
              try {
                const r = await fetch('/api/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ consentGiven: false }) });
                if (r.ok) alert('Einwilligung widerrufen. Deine Daten werden nicht gelöscht, aber die Verarbeitung eingestellt.');
                else alert('Fehler beim Widerrufen');
              } catch { alert('Fehler beim Widerrufen'); }
            }} style={{ width: '100%', padding: '10px 16px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#856404' }}>⚠️ Einwilligung widerrufen</button>
            <button onClick={async () => {
              setMenuOpen(false);
              if (!confirm('Bist du sicher, dass du dein Konto löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden. Alle personenbezogenen Daten werden entfernt.')) return;
              try {
                const r = await fetch('/api/auth/account', { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
                if (r.ok) { alert('Dein Konto wurde gelöscht.'); logout(); }
                else { const d = await r.json(); alert(d.error || 'Fehler'); }
              } catch { alert('Fehler beim Löschen'); }
            }} style={{ width: '100%', padding: '10px 16px', background: '#fff3f3', border: '2px solid #dc3545', borderRadius: 8, cursor: 'pointer', textAlign: 'left', fontSize: 14, color: '#dc3545', fontWeight: 'bold' }}>🗑️ Konto löschen (Art. 17 DSGVO)</button>
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
                  <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 10, borderLeft: '4px solid ' + clubAccent, overflow: 'hidden' }}>
                    <div style={{ minWidth: 0, flexShrink: 0 }}>
                      <div style={{ fontSize: 16 }}>{s?.arbeitsbereich?.icon || '📍'}</div>
                      <div style={{ fontSize: 13, fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{s?.arbeitsbereich?.name || '–'}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#666' }}>{new Date(vs.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</div>
                      {s?.zeitslot && <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.zeitslot.startTime}–{s.zeitslot.endTime}</div>}
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 40, flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 'bold', color: remaining > 0 ? clubAccent : '#6c757d' }}>{remaining}/{s?.maxVolunteers || 0}</div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <button onClick={() => unassign(vs.id)} title="Abmelden" style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: clubSecondary, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
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
      {activeSection === 'schichten' && (
        <>
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
                  <div style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                    <div style={{ minWidth: 0, flexShrink: 0 }}>
                      <div style={{ fontSize: 16 }}>{slot.arbeitsbereich?.icon || '📍'}</div>
                      <div style={{ fontSize: 13, fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{slot.arbeitsbereich?.name || '–'}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#666' }}>{new Date(slot.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</div>
                      {slot.zeitslot && <div style={{ fontSize: 14, fontWeight: 'bold', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{slot.zeitslot.startTime}–{slot.zeitslot.endTime}</div>}
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 40, flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 'bold', color: remaining > 0 ? clubAccent : '#6c757d' }}>{remaining}/{slot.maxVolunteers}</div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {assigned ? (
                        <button onClick={() => unassign(myShift!.id)} title="Abmelden" style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: clubSecondary, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 7v6h6" />
                            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                          </svg>
                        </button>
                      ) : remaining > 0 ? (
                        <button onClick={() => assign(slot.id, dateStr)} title="Zuweisen" style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: clubSecondary, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                          <span style={{ color: '#fff', lineHeight: 1, fontWeight: 'bold' }}>+</span>
                        </button>
                      ) : (
                        <span style={{ width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e9ecef', color: '#adb5bd', fontSize: 22, overflow: 'hidden' }}>✖</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </>
      )}

      {/* Lebensmittel Spenden */}
      {activeSection === 'spenden' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

          {/* Lebensmittel-Slots für Kinder */}
          {foodDonationSlots.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: '600', color: clubPrimary }}>📊 Lebensmittel-Slots für deine Kinder</h3>
              {(() => {
                // Nach Jahrgang gruppieren
                const grouped: Record<string, FoodDonationSlot[]> = {};
                foodDonationSlots.forEach(slot => {
                  const key = slot.yearGroup?.name || 'Ohne Jahrgang';
                  if (!grouped[key]) grouped[key] = [];
                  grouped[key].push(slot);
                });
                
                return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([yearName, slots]) => {
                  // Gesamtsumme für diesen Jahrgang
                  const totalTarget = slots.reduce((s, sl) => s + sl.targetQuantity, 0);
                  const totalCollected = slots.reduce((s, sl) => s + sl.collected, 0);
                  const progress = totalTarget > 0 ? Math.min(100, (totalCollected / totalTarget) * 100) : 0;
                  
                  // Zeige welche Kinder-Jahrgänge passen
                  const firstSlot = slots[0];
                  const matchingChildren = volunteer?.children?.filter(c => {
                    if (!c.childYear || !firstSlot.yearGroup) return false;
                    return c.childYear >= firstSlot.yearGroup.birthYearStart && c.childYear <= firstSlot.yearGroup.birthYearEnd;
                  }) || [];
                  
                  return (
                    <div key={yearName} style={{ marginBottom: 20 }}>
                      {/* Jahrgang-Header */}
                      <div style={{ background: '#f8f9fa', padding: '10px 14px', borderRadius: 10, marginBottom: 10, borderLeft: `4px solid ${clubPrimary}` }}>
                        <div style={{ fontWeight: '600', fontSize: 15, color: '#333' }}>{yearName}</div>
                        {matchingChildren.length > 0 && (
                          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                            Für: {matchingChildren.map(c => c.childName ? `${c.childName} (${c.childYear})` : `Jahrgang ${c.childYear}`).join(', ')}
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                          {totalCollected} / {totalTarget} gesamt
                        </div>
                      </div>
                      {/* Fortschrittsbalken */}
                      <div style={{ background: '#e9ecef', borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? '#198754' : clubAccent, borderRadius: 4 }} />
                      </div>
                      {/* Einzelne Artikel – erfüllte nach unten */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {slots
                          .sort((a, b) => {
                            const aDone = a.targetQuantity > 0 && a.collected >= a.targetQuantity;
                            const bDone = b.targetQuantity > 0 && b.collected >= b.targetQuantity;
                            if (aDone === bDone) return 0;
                            return aDone ? 1 : -1;
                          })
                          .map(slot => {
                          const slotProgress = slot.targetQuantity > 0 ? Math.min(100, (slot.collected / slot.targetQuantity) * 100) : 0;
                          const remaining = slot.targetQuantity - slot.collected;
                          // Wie viel hat DER Helfer bereits für diesen Slot zugesagt?
                          const myCommitted = myDonations
                            .filter(d => d.foodDonationSlotId === slot.id)
                            .reduce((sum, d) => sum + d.quantity, 0);
                          const committed = slotCommitments[slot.id] || 0;
                          return (
                            <div key={slot.id} style={{ padding: 12, background: '#f8f9fa', borderRadius: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 20 }}>{slot.foodItem?.icon || '🍽️'}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: '600', fontSize: 14, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slot.foodItem?.name || '–'}</div>
                                  <div style={{ fontSize: 12, color: '#999' }}>{remaining > 0 ? `${remaining} ${slot.foodItem?.unit} noch gesucht` : '✓ Erfüllt'}</div>
                                </div>
                                <div style={{ textAlign: 'right', minWidth: 70 }}>
                                  <div style={{ fontSize: 16, fontWeight: 'bold', color: slotProgress >= 100 ? '#198754' : clubAccent }}>{slot.collected}</div>
                                  <div style={{ fontSize: 11, color: '#999' }}>von {slot.targetQuantity} {slot.foodItem?.unit}</div>
                                </div>
                              </div>
                              {/* Zeige wie viel der Helfer bereits bringt */}
                              {myCommitted > 0 && (
                                <div style={{ fontSize: 13, color: clubSecondary, fontWeight: '600', marginTop: 4 }}>
                                  ✅ Du bringst: {myCommitted} {slot.foodItem?.unit}
                                </div>
                              )}
                              {/* Fortschritt */}
                              {slot.targetQuantity > 0 && (
                                <div style={{ background: '#e9ecef', borderRadius: 4, height: 6, overflow: 'hidden', marginTop: 8 }}>
                                  <div style={{ width: `${slotProgress}%`, height: '100%', background: slotProgress >= 100 ? '#198754' : clubAccent, borderRadius: 4 }} />
                                </div>
                              )}
                              {/* Zusage-Button/Input */}
                              {remaining > 0 && !committed && (
                                <button onClick={() => setSlotCommitments({ ...slotCommitments, [slot.id]: 1 })} style={{ marginTop: 8, width: '100%', padding: '10px 0', background: clubSecondary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 20, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                              )}
                              {committed > 0 && (
                                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <input type="number" min="1" value={committed} onChange={e => setSlotCommitments({ ...slotCommitments, [slot.id]: parseInt(e.target.value) || 0 })} style={{ width: 70, padding: '8px 10px', border: '2px solid #e9ecef', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                                  <span style={{ fontSize: 13, color: '#666' }}>{slot.foodItem?.unit}</span>
                                  <button onClick={() => commitSlot(slot.id, slot.foodItemId!)} title="Zusagen" style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: clubSecondary, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  </button>
                                  <button onClick={() => removeCommitment(slot.id)} title="Rücknahme" style={{ width: 40, height: 40, borderRadius: 8, border: 'none', background: '#fde8e8', color: '#dc3545', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M3 7v6h6" />
                                      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Zusätzliche Spende */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: '600', color: clubPrimary }}>🍞 Zusätzliche Spende</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <select value={donationFoodId} onChange={e => setDonationFoodId(parseInt(e.target.value))} style={{ padding: '12px 14px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 15, outline: 'none', background: '#fff', boxSizing: 'border-box' }}>
                <option value={0}>-- Artikel auswählen --</option>
                {foodCategories.map(cat => (
                  <optgroup key={cat.id} label={`${cat.icon} ${cat.name}`}>
                    {cat.items.map(item => (
                      <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <input value={donationQuantity} onChange={e => setDonationQuantity(e.target.value)} placeholder="Menge" type="number" min="1" style={{ padding: '12px 14px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
              <input value={donationNote} onChange={e => setDonationNote(e.target.value)} placeholder="Notiz (optional)" style={{ padding: '12px 14px', border: '2px solid #e9ecef', borderRadius: 10, fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
              <button onClick={submitDonation} style={{ padding: '14px 0', background: clubSecondary, color: '#fff', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>📦 Spende eintragen</button>
            </div>
          </div>
        </div>
      )}

      {/* Menü schließen beim Klick außerhalb */}
      {menuOpen && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }} onClick={() => setMenuOpen(false)} />}
    </div>
  );
}
