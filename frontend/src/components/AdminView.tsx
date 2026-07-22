import { useState, useEffect, useMemo } from 'react';

interface Tournament { id: number; name: string; startDate: string; endDate: string; status: string; clubId: number | null; club: { id: number; name: string; logo: string | null; primaryColor: string; secondaryColor: string; accentColor: string } | null; }
interface Shift { id: number; tournamentId: number; date: string; zeitslotId: number | null; slot: string; arbeitsbereichId: number | null; maxVolunteers: number; description: string | null; zeitslot: { id: number; name: string; startTime: string; endTime: string; color: string; order: number } | null; arbeitsbereich: { id: number; name: string; icon: string; color: string } | null; }
interface Arbeitsbereich { id: number; name: string; icon: string; color: string; minVolunteers: number; maxVolunteers: number; }
interface Zeitslot { id: number; name: string; startTime: string; endTime: string; color: string; order: number; }
interface VolunteerShift { id: number; volunteerId: number; tournamentId: number | null; date: string; slot: string; role: string; arbeitsbereichId: number | null; }
interface Volunteer { id: number; name: string; email: string | null; phone: string | null; roles: string[]; }
interface Club { id: number; name: string; logo: string | null; primaryColor: string; secondaryColor: string; accentColor: string; }

type AdminTab = 'turniere' | 'arbeitsbereiche' | 'zeitslots' | 'helfer' | 'zeitslots-verwalten' | 'clubs' | 'uebersicht';

export default function AdminView() {
  const [activeTab, setActiveTab] = useState<AdminTab>('turniere');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const [arbeitsbereiche, setArbeitsbereiche] = useState<Arbeitsbereich[]>([]);
  const [zeitSlots, setZeitSlots] = useState<Zeitslot[]>([]);
  const [jobSlots, setJobSlots] = useState<Shift[]>([]);
  const [volunteerShifts, setVolunteerShifts] = useState<VolunteerShift[]>([]);
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [slotForm, setSlotForm] = useState({ dates: [] as string[], zeitslotId: 0 as number, arbeitsbereichIds: [] as number[], description: '' });
  const [filterDate, setFilterDate] = useState('');
  const [filterAb, setFilterAb] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [statusDialog, setStatusDialog] = useState({ open: false, tournament: null as Tournament | null, editName: '', editClubId: '', editStart: '', editEnd: '' });
  const [abForm, setAbForm] = useState({ name: '', icon: '📍', color: '#3b98f8', minVolunteers: 2, maxVolunteers: 8 });
  const [zsForm, setZsForm] = useState({ name: '', startTime: '09:00', endTime: '10:00', color: '#3b98f8', order: 1 });
  const [editingAb, setEditingAb] = useState<number | null>(null);
  const [editingZs, setEditingZs] = useState<number | null>(null);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [volForm, setVolForm] = useState({ name: '', email: '', phone: '' });
  const [editingVol, setEditingVol] = useState<number | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubForm, setClubForm] = useState({ name: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' });
  const [editingClub, setEditingClub] = useState<number | null>(null);
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [emojiPicker, setEmojiPicker] = useState(false);
  const [busy, setBusy] = useState(false);

  const statusBadge = (status: string) => status === 'aktiv' ? '🟢' : status === 'beendet' ? '🟡' : '⚪';

  useEffect(() => {
    fetch('/api/tournaments').then(r => r.json()).then(setTournaments);
    fetch('/api/arbeitsbereiche').then(r => r.json()).then(setArbeitsbereiche);
    fetch('/api/zeit-slots').then(r => r.json()).then(setZeitSlots);
    fetch('/api/volunteers').then(r => r.json()).then(setVolunteers);
    fetch('/api/clubs').then(r => r.json()).then(setClubs);
  }, []);

  useEffect(() => {
    if (!selectedTournament) return;
    setBusy(true);
    Promise.all([
      fetch(`/api/shifts?tournamentId=${selectedTournament}`).then(r => r.json()).then(setJobSlots),
      fetch(`/api/volunteer-shifts?tournamentId=${selectedTournament}`).then(r => r.json()).then(setVolunteerShifts),
    ]).finally(() => setBusy(false));
  }, [selectedTournament]);

  // Automatische Auswahl des nächsten aktiven Turniers beim Wechsel zu Management Buchungen / Übersicht
  useEffect(() => {
    if ((activeTab === 'zeitslots-verwalten' || activeTab === 'uebersicht') && !selectedTournament) {
      const activeTournament = tournaments.find(t => t.status === 'aktiv');
      if (activeTournament) {
        setSelectedTournament(activeTournament.id);
      }
    }
  }, [activeTab, tournaments]);

  const selectedTournamentData = tournaments.find(t => t.id === selectedTournament);
  const tournamentDays = useMemo(() => {
    if (!selectedTournament || !selectedTournamentData) return [];
    const days: string[] = [];
    const start = new Date(selectedTournamentData.startDate);
    const end = new Date(selectedTournamentData.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(d.toISOString().split('T')[0]);
    return days;
  }, [selectedTournament, selectedTournamentData]);

  const getZsLabel = (id: number) => zeitSlots.find(z => z.id === id)?.name || '–';
  const getZsColor = (id: number) => zeitSlots.find(z => z.id === id)?.color || '#3b98f8';
  const getAbName = (id: number) => arbeitsbereiche.find(a => a.id === id)?.name || '–';
  const getAbIcon = (id: number) => arbeitsbereiche.find(a => a.id === id)?.icon || '📍';
  const getAbColor = (id: number) => arbeitsbereiche.find(a => a.id === id)?.color || '#3b98f8';

  const slotVolunteerCounts = useMemo(() => {
    if (!selectedTournament) return {};
    const map: Record<number, { count: number; status: string }> = {};
    jobSlots.forEach(slot => { map[slot.id] = { count: 0, status: 'empty' }; });
    volunteerShifts.forEach(vs => {
      if (vs.tournamentId !== selectedTournament) return;
      const vsDate = new Date(vs.date).toISOString().split('T')[0];
      jobSlots.forEach(slot => {
        if (slot.tournamentId === selectedTournament && slot.date.split('T')[0] === vsDate && vs.slot === slot.slot && (!slot.arbeitsbereichId || String(vs.arbeitsbereichId) === String(slot.arbeitsbereichId))) {
          map[slot.id].count++;
        }
      });
    });
    Object.entries(map).forEach(([id, info]) => {
      const slot = jobSlots.find(s => s.id === parseInt(id));
      if (slot) { map[parseInt(id)].status = info.count >= slot.maxVolunteers ? 'full' : info.count > 0 ? 'partial' : 'empty'; }
    });
    return map;
  }, [volunteerShifts, jobSlots, selectedTournament]);

  const filteredSlots = useMemo(() => {
    return jobSlots.filter(s => {
      if (filterDate && new Date(s.date).toLocaleDateString('de-DE') !== filterDate) return false;
      if (filterAb && String(s.arbeitsbereichId) !== filterAb) return false;
      if (filterSearch && !s.slot.toLowerCase().includes(filterSearch.toLowerCase()) && !getAbName(s.arbeitsbereichId || 0).toLowerCase().includes(filterSearch.toLowerCase())) return false;
      return true;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [jobSlots, filterDate, filterAb, filterSearch]);

  const saveSlot = async () => {
    if (!selectedTournament) return alert('Bitte Turnier wählen!');
    if (slotForm.dates.length === 0 || slotForm.zeitslotId === 0 || slotForm.arbeitsbereichIds.length === 0) return alert('Bitte Datum, Zeitslot und Bereich wählen!');
    if (editingSlotId) {
      for (const date of slotForm.dates) {
        const existing = jobSlots.find(s => s.id === editingSlotId && s.date.split('T')[0] === date);
        if (existing) {
          const zs = zeitSlots.find(z => z.id === slotForm.zeitslotId);
          const slotName = zs ? `${zs.name} (${zs.startTime}–${zs.endTime})` : '';
          await fetch(`/api/shifts/${editingSlotId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, zeitslotId: slotForm.zeitslotId, arbeitsbereichId: slotForm.arbeitsbereichIds[0], maxVolunteers: arbeitsbereiche.find(a => a.id === slotForm.arbeitsbereichIds[0])?.maxVolunteers || 8, description: slotForm.description || null, slot: slotName }) });
        }
      }
    } else {
      const zs = zeitSlots.find(z => z.id === slotForm.zeitslotId);
      const slotName = zs ? `${zs.name} (${zs.startTime}–${zs.endTime})` : '';
      for (const date of slotForm.dates) {
        for (const abId of slotForm.arbeitsbereichIds) {
          const maxVol = arbeitsbereiche.find(a => a.id === abId)?.maxVolunteers || 8;
          await fetch('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tournamentId: selectedTournament, date, zeitslotId: slotForm.zeitslotId, arbeitsbereichId: abId, maxVolunteers: maxVol, description: slotForm.description || null, slot: slotName }) });
        }
      }
    }
    setJobSlots(await (await fetch('/api/shifts?tournamentId=' + selectedTournament)).json());
    setEditingSlotId(null);
    setSlotForm({ dates: [], zeitslotId: 0, arbeitsbereichIds: [], description: '' });
  };

  const startEditSlot = (slot: Shift) => { setEditingSlotId(slot.id); setSlotForm({ dates: [slot.date.split('T')[0]], zeitslotId: slot.zeitslotId || 0, arbeitsbereichIds: slot.arbeitsbereichId ? [slot.arbeitsbereichId] : [], description: slot.description || '' }); };

  const deleteSlot = async (id: number) => { if (!confirm('Job-Slot löschen?')) return; await fetch(`/api/shifts/${id}`, { method: 'DELETE' }); setJobSlots(await (await fetch('/api/shifts?tournamentId=' + selectedTournament)).json()); };

  const closeStatusDialog = () => setStatusDialog({ open: false, tournament: null, editName: '', editClubId: '', editStart: '', editEnd: '' });
  const updateTournamentStatus = async (status: string) => { if (!statusDialog.tournament) return; await fetch(`/api/tournaments/${statusDialog.tournament.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); setTournaments(await (await fetch('/api/tournaments')).json()); closeStatusDialog(); };

  const saveTournamentEdit = async () => {
    if (!statusDialog.tournament) return;
    if (!statusDialog.editName.trim()) return alert('Name erforderlich!');
    await fetch(`/api/tournaments/${statusDialog.tournament.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: statusDialog.editName,
        startDate: statusDialog.editStart,
        endDate: statusDialog.editEnd,
        clubId: statusDialog.editClubId ? parseInt(statusDialog.editClubId) : null,
      }),
    });
    setTournaments(await (await fetch('/api/tournaments')).json());
  };

  const saveArbeitsbereich = async () => {
    if (!abForm.name.trim()) return alert('Name erforderlich!');
    if (editingAb) { await fetch(`/api/arbeitsbereiche/${editingAb}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(abForm) }); }
    else { await fetch('/api/arbeitsbereiche', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(abForm) }); }
    setArbeitsbereiche(await (await fetch('/api/arbeitsbereiche')).json());
    setAbForm({ name: '', icon: '📍', color: '#3b98f8', minVolunteers: 2, maxVolunteers: 8 });
    setEditingAb(null);
  };

  const deleteArbeitsbereich = async (id: number) => { if (!confirm('Bereich löschen?')) return; await fetch(`/api/arbeitsbereiche/${id}`, { method: 'DELETE' }); setArbeitsbereiche(await (await fetch('/api/arbeitsbereiche')).json()); };

  const saveZeitslot = async () => {
    if (!zsForm.name.trim()) return alert('Name erforderlich!');
    if (editingZs) { await fetch(`/api/zeit-slots/${editingZs}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(zsForm) }); }
    else { await fetch('/api/zeit-slots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(zsForm) }); }
    setZeitSlots(await (await fetch('/api/zeit-slots')).json());
    setZsForm({ name: '', startTime: '09:00', endTime: '10:00', color: '#3b98f8', order: 1 });
    setEditingZs(null);
  };

  const deleteZeitslot = async (id: number) => { if (!confirm('Zeitslot löschen?')) return; await fetch(`/api/zeit-slots/${id}`, { method: 'DELETE' }); setZeitSlots(await (await fetch('/api/zeit-slots')).json()); };

  const saveVolunteer = async () => {
    if (!volForm.name.trim()) return alert('Name erforderlich!');
    if (editingVol) {
      await fetch(`/api/volunteers/${editingVol}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...volForm, roles: ['Helfer'] }) });
    } else {
      await fetch('/api/volunteers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...volForm, roles: ['Helfer'] }) });
    }
    setVolunteers(await (await fetch('/api/volunteers')).json());
    setVolForm({ name: '', email: '', phone: '' });
    setEditingVol(null);
  };

  const deleteVolunteer = async (id: number) => {
    if (!confirm('Helfer löschen? Alle Einsätze werden entfernt.')) return;
    await fetch(`/api/volunteers/${id}`, { method: 'DELETE' });
    setVolunteers(await (await fetch('/api/volunteers')).json());
  };

  const saveClub = async () => {
    if (!clubForm.name.trim()) return alert('Name erforderlich!');
    const data: { name: string; primaryColor: string; secondaryColor: string; accentColor: string; logo?: string } = { name: clubForm.name, primaryColor: clubForm.primaryColor, secondaryColor: clubForm.secondaryColor, accentColor: clubForm.accentColor };
    if (clubForm.logo) data.logo = clubForm.logo;
    if (editingClub) {
      await fetch(`/api/clubs/${editingClub}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    } else {
      await fetch('/api/clubs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    }
    setClubs(await (await fetch('/api/clubs')).json());
    setClubForm({ name: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' });
    setClubLogo(null);
    setEditingClub(null);
  };

  const deleteClub = async (id: number) => {
    if (!confirm('Verein löschen?')) return;
    await fetch(`/api/clubs/${id}`, { method: 'DELETE' });
    setClubs(await (await fetch('/api/clubs')).json());
  };

  const startEditClub = (club: Club) => {
    setEditingClub(club.id);
    setClubForm({ name: club.name, primaryColor: club.primaryColor, secondaryColor: club.secondaryColor, accentColor: club.accentColor, logo: club.logo || '' });
    setClubLogo(club.logo);
  };

    const rgbToHex = (r: number, g: number, b: number): string => {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  const extractColors = (img: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { primary: '#0d6efd', secondary: '#6c757d', accent: '#198754' };
    ctx.drawImage(img, 0, 0, 50, 50);
    const data = ctx.getImageData(0, 0, 50, 50).data;
    const colorMap = new Map<string, number>();
    for (let i = 0; i < data.length; i += 4) {
      const r = Math.round(data[i] / 16) * 16;
      const g = Math.round(data[i + 1] / 16) * 16;
      const b = Math.round(data[i + 2] / 16) * 16;
      const key = rgbToHex(r, g, b);
      colorMap.set(key, (colorMap.get(key) || 0) + 1);
    }
    const sorted = Array.from(colorMap.entries()).sort((a, b) => b[1] - a[1]);
    const primary = sorted[0]?.[0] || '#0d6efd';
    const secondary = sorted[1]?.[0] || '#6c757d';
    const accent = sorted[2]?.[0] || '#198754';
    return { primary, secondary, accent };
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const result = reader.result as string;
      setClubLogo(result);
      setClubForm(f => ({ ...f, logo: result }));
      try {
        const img = new Image();
        img.onload = () => {
          const colors = extractColors(img);
          setClubForm(f => ({ ...f, primaryColor: colors.primary, secondaryColor: colors.secondary, accentColor: colors.accent }));
        };
        img.src = result;
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const emojiList = ['🏪', '🍳', '🔥', '🎪', '🎯', '⚽', '🍰', '☕', '🥤', '🏆', '📦', '🗑️', '💰', '🎁', '🎵', '🎠', '🧸', '🎴', '🎲', '🏅', '🥇', '🎖️', '📋', '✅', '❌', '⏰', '📍', '📞', '🔧', '📢', '📣', '📝'];

  const tdStyle: React.CSSProperties = { padding: '12px 16px', border: '1px solid #e9ecef', verticalAlign: 'top' };
  const thStyle: React.CSSProperties = { ...tdStyle, background: '#f8f9fa', fontWeight: '600', fontSize: 13, color: '#495057' };
  const btnStyle: React.CSSProperties = { padding: '6px 12px', cursor: 'pointer', border: '1px solid #dee2e6', borderRadius: 8, background: '#f8f9fa', fontSize: 13 };

  const shadeColor = (color: string, percent: number) => {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);
    R = Math.max(0, Math.min(255, R + Math.round(R * percent / 100)));
    G = Math.max(0, Math.min(255, G + Math.round(G * percent / 100)));
    B = Math.max(0, Math.min(255, B + Math.round(B * percent / 100)));
    return '#' + (R.toString(16).padStart(2, '0')) + (G.toString(16).padStart(2, '0')) + (B.toString(16).padStart(2, '0'));
  };

  const [adminPrimary, setAdminPrimary] = useState('#0d6efd');
  const [adminSecondary, setAdminSecondary] = useState('#6c757d');
  const [adminAccent, setAdminAccent] = useState('#198754');
  const [adminLogo, setAdminLogo] = useState<string | null>(null);

  // Farbableitung: Welche Farben gelten für die gesamte AdminView?
  // 1. Aktives Turnier mit Club → Club-Farben (primary, secondary, accent)
  // 2. Kein aktives Turnier → Erster definierter Club
  // 3. Kein Club definiert → Default-Blau/Grau/Grün
  useEffect(() => {
    // 1. Versuche aktives Turnier
    const activeTournament = tournaments.find(t => t.status === 'aktiv');
    if (activeTournament?.club?.primaryColor) {
      setAdminPrimary(activeTournament.club.primaryColor);
      setAdminSecondary(activeTournament.club.secondaryColor || '#6c757d');
      setAdminAccent(activeTournament.club.accentColor || '#198754');
      setAdminLogo(activeTournament.club.logo || null);
      return;
    }
    // 2. Fallback: Erster Club mit Farben
    const firstClub = clubs.find(c => c.primaryColor);
    if (firstClub) {
      setAdminPrimary(firstClub.primaryColor);
      setAdminSecondary(firstClub.secondaryColor || '#6c757d');
      setAdminAccent(firstClub.accentColor || '#198754');
      setAdminLogo(firstClub.logo || null);
      return;
    }
    // 3. Fallback: Default-Farben (bereits initial gesetzt)
  }, [tournaments, clubs]);

  const tabGroups = [
    { name: 'Management Jobslots', keys: ['zeitslots-verwalten'] as AdminTab[] },
    { name: 'Management Buchungen', keys: ['uebersicht'] as AdminTab[] },
    { name: 'Stammdaten', keys: ['clubs', 'arbeitsbereiche', 'zeitslots', 'helfer', 'turniere'] as AdminTab[] },
  ];

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'zeitslots-verwalten', label: '📋 Management Job Slots' },
    { key: 'uebersicht', label: '📊 Management Buchungen' },
    { key: 'clubs', label: '🏅 Vereine' },
    { key: 'arbeitsbereiche', label: '📍 Arbeitsbereiche' },
    { key: 'zeitslots', label: '🕐 Zeitslots' },
    { key: 'helfer', label: '👥 Helfer' },
    { key: 'turniere', label: '🏆 Turniere' },
  ];

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1400, margin: '0 auto', minHeight: '100vh', background: '#f5f6f8', padding: '24px 20px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, ' + adminPrimary + ' 0%, ' + shadeColor(adminPrimary, -10) + ' 100%)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, color: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          {adminLogo ? (
            <img src={adminLogo} alt="Verein" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'contain', background: '#fff', padding: 4 }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 22 }}>
              {(tournaments.find(t => t.club)?.club?.name || 'TSV')[0]}
            </div>
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: '700' }}>Turnierplaner · Admin</h2>
            <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: 13 }}>{tournaments.find(t => t.club)?.club?.name || 'Vereinsverwaltung'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {tabs.map((t, i) => {
            const currentGroupIdx = tabGroups.findIndex(g => g.keys.includes(t.key));
            const prevGroupIdx = i > 0 ? tabGroups.findIndex(g => g.keys.includes(tabs[i - 1]?.key)) : -1;
            const isFirstInGroup = prevGroupIdx !== currentGroupIdx;
            return (
              <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: isFirstInGroup ? 12 : 0 }}>
                {isFirstInGroup && <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.3)' }} />}
                <button
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: 8,
                    background: activeTab === t.key ? 'rgba(255,255,255,0.22)' : 'transparent',
                    color: activeTab === t.key ? '#fff' : 'rgba(255,255,255,0.75)',
                    cursor: 'pointer',
                    fontWeight: activeTab === t.key ? '600' : '400',
                    fontSize: 13,
                    transition: 'all 0.2s',
                    borderBottom: activeTab === t.key ? '2px solid #fff' : '2px solid transparent',
                    marginBottom: -2
                  }}
                >
                  {t.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== TURNIER-VERWALTUNG ==================== */}
      {activeTab === 'turniere' && (
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
          <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>🏆 Turnier-Verwaltung</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input placeholder="Turnier-Name" id="tournamentName" style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', width: 200 }} />
            <input type="date" id="tournamentStart" style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none' }} />
            <input type="date" id="tournamentEnd" style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none' }} />
            <select id="tournamentClub" style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff' }}>
              <option value="">-- Kein Verein --</option>
              {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={async () => {
              const name = (document.getElementById('tournamentName') as HTMLInputElement).value;
              const start = (document.getElementById('tournamentStart') as HTMLInputElement).value;
              const end = (document.getElementById('tournamentEnd') as HTMLInputElement).value;
              const clubId = (document.getElementById('tournamentClub') as HTMLInputElement).value;
              if (!name || !start || !end) return alert('Alle Felder erforderlich!');
              await fetch('/api/tournaments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, startDate: start, endDate: end, status: 'aktiv', clubId: clubId ? parseInt(clubId) : null }) });
              setTournaments(await (await fetch('/api/tournaments')).json());
            }} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>➕ Turnier</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={thStyle}>Verein</th><th style={thStyle}>Name</th><th style={thStyle}>Von</th><th style={thStyle}>Bis</th><th style={thStyle}>Status</th><th style={thStyle}>Aktion</th></tr></thead>
            <tbody>
              {tournaments.map(t => (
                <tr key={t.id}>
                  <td style={tdStyle}>
                    {t.club ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {t.club.logo ? (
                          <img src={t.club.logo} alt={t.club.name} style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />
                        ) : (
                          <span style={{ width: 28, height: 28, borderRadius: 8, background: t.club.primaryColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                            {t.club.name.charAt(0)}
                          </span>
                        )}
                        <span style={{ fontSize: 12 }}>{t.club.name}</span>
                      </span>
                    ) : <span style={{ color: '#999' }}>–</span>}
                  </td>
                  <td style={tdStyle}>{t.name}</td>
                  <td style={tdStyle}>{new Date(t.startDate).toLocaleDateString('de-DE')}</td>
                  <td style={tdStyle}>{new Date(t.endDate).toLocaleDateString('de-DE')}</td>
                  <td style={tdStyle}>{statusBadge(t.status)}</td>
                  <td style={tdStyle}>
                    <button onClick={() => setStatusDialog({ open: true, tournament: t, editName: t.name, editClubId: String(t.clubId || ''), editStart: t.startDate?.split('T')[0] || '', editEnd: t.endDate?.split('T')[0] || '' })} style={{ ...btnStyle, background: adminSecondary, color: '#fff', border: 'none' }}>⚙️</button>
                  </td>
                </tr>
              ))}
              {tournaments.length === 0 && <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#666', padding: 24 }}>Keine Turniere vorhanden.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== ARBEITSBEREICHE ==================== */}
      {activeTab === 'arbeitsbereiche' && (
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
          <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>📍 Arbeitsbereiche</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={abForm.name} onChange={e => setAbForm({ ...abForm, name: e.target.value })} placeholder="Name" style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', width: 200 }} />
            <button onClick={() => setEmojiPicker(!emojiPicker)} style={{ ...btnStyle, fontSize: 20, background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 10 }}>{abForm.icon}</button>
            {emojiPicker && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 10, background: '#fff', border: '1px solid #dee2e6', borderRadius: 12, position: 'absolute', zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                {emojiList.map(e => <button key={e} onClick={() => { setAbForm({ ...abForm, icon: e }); setEmojiPicker(false); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>{e}</button>)}
              </div>
            )}
            <input type="color" value={abForm.color} onChange={e => setAbForm({ ...abForm, color: e.target.value })} style={{ width: 44, height: 38, padding: 0, border: '1px solid #dee2e6', borderRadius: 8 }} />
            <input type="number" value={abForm.minVolunteers} onChange={e => setAbForm({ ...abForm, minVolunteers: parseInt(e.target.value) || 0 })} placeholder="Min" style={{ ...btnStyle, width: 50 }} />
            <input type="number" value={abForm.maxVolunteers} onChange={e => setAbForm({ ...abForm, maxVolunteers: parseInt(e.target.value) || 0 })} placeholder="Max" style={{ ...btnStyle, width: 50 }} />
            <button onClick={saveArbeitsbereich} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>{editingAb ? '💾 Speichern' : '➕ Hinzufügen'}</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={thStyle}>Icon</th><th style={thStyle}>Name</th><th style={thStyle}>Farbe</th><th style={thStyle}>Min</th><th style={thStyle}>Max</th><th style={thStyle}>Aktion</th></tr></thead>
            <tbody>
              {arbeitsbereiche.map(ab => (
                <tr key={ab.id}>
                  <td style={{ ...tdStyle, fontSize: 24 }}>{ab.icon}</td>
                  <td style={tdStyle}>{ab.name}</td>
                  <td style={{ ...tdStyle, background: ab.color, width: 60 }}></td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{ab.minVolunteers}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{ab.maxVolunteers}</td>
                  <td style={tdStyle}>
                    <button onClick={() => { setEditingAb(ab.id); setAbForm({ name: ab.name, icon: ab.icon, color: ab.color, minVolunteers: ab.minVolunteers, maxVolunteers: ab.maxVolunteers }); }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', border: 'none' }}>✏️</button>
                    <button onClick={() => deleteArbeitsbereich(ab.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== HELFER ==================== */}
      {activeTab === 'helfer' && (
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
          <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>👥 Helfer-Verwaltung ({volunteers.length})</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={volForm.name} onChange={e => setVolForm({ ...volForm, name: e.target.value })} placeholder="Name" style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', width: 200 }} />
            <input value={volForm.email} onChange={e => setVolForm({ ...volForm, email: e.target.value })} placeholder="E-Mail" style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', width: 250 }} />
            <input value={volForm.phone} onChange={e => setVolForm({ ...volForm, phone: e.target.value })} placeholder="Handynummer" style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', width: 180 }} />
            <button onClick={saveVolunteer} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>{editingVol ? '💾 Speichern' : '➕ Helfer anlegen'}</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={thStyle}>Name</th><th style={thStyle}>E-Mail</th><th style={thStyle}>Handynummer</th><th style={thStyle}>Rollen</th><th style={thStyle}>Aktion</th></tr></thead>
            <tbody>
              {volunteers.map(v => (
                <tr key={v.id}>
                  <td style={tdStyle}>{v.name}</td>
                  <td style={tdStyle}>{v.email || '–'}</td>
                  <td style={tdStyle}>{v.phone || '–'}</td>
                  <td style={tdStyle}>{v.roles?.join(', ') || '–'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => { setEditingVol(v.id); setVolForm({ name: v.name, email: v.email || '', phone: v.phone || '' }); }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', border: 'none' }}>✏️</button>
                    <button onClick={async () => {
                      const pw = prompt('Neues Passwort für ' + v.name + ':');
                      if (!pw) return;
                      await fetch(`/api/volunteers/${v.id}/password`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
                      alert('✅ Passwort gesetzt!');
                    }} style={{ ...btnStyle, background: '#d1e7dd', color: '#0f5132', border: 'none' }}>🔑</button>
                    <button onClick={() => deleteVolunteer(v.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}>🗑️</button>
                  </td>
                </tr>
              ))}
              {volunteers.length === 0 && <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#666', padding: 24 }}>Keine Helfer vorhanden.</td></tr>}</tbody>
          </table>
        </div>
      )}

      {/* ==================== ZEITSLOTS ==================== */}
      {activeTab === 'zeitslots' && (
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
          <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>🕐 Zeitslots</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input value={zsForm.name} onChange={e => setZsForm({ ...zsForm, name: e.target.value })} placeholder="Name" style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', width: 200 }} />
            <input type="time" value={zsForm.startTime} onChange={e => setZsForm({ ...zsForm, startTime: e.target.value })} style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none' }} />
            <input type="time" value={zsForm.endTime} onChange={e => setZsForm({ ...zsForm, endTime: e.target.value })} style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none' }} />
            <input type="color" value={zsForm.color} onChange={e => setZsForm({ ...zsForm, color: e.target.value })} style={{ width: 44, height: 38, padding: 0, border: '1px solid #dee2e6', borderRadius: 8 }} />
            <input type="number" value={zsForm.order} onChange={e => setZsForm({ ...zsForm, order: parseInt(e.target.value) || 1 })} placeholder="Reihenfolge" style={{ ...btnStyle, width: 80 }} />
            <button onClick={saveZeitslot} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>{editingZs ? '💾 Speichern' : '➕ Hinzufügen'}</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={thStyle}>Reihenfolge</th><th style={thStyle}>Name</th><th style={thStyle}>Von</th><th style={thStyle}>Bis</th><th style={thStyle}>Farbe</th><th style={thStyle}>Aktion</th></tr></thead>
            <tbody>
              {zeitSlots.sort((a, b) => a.order - b.order).map(zs => (
                <tr key={zs.id}>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{zs.order}</td>
                  <td style={tdStyle}>{zs.name}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{zs.startTime}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{zs.endTime}</td>
                  <td style={{ ...tdStyle, background: zs.color, width: 60 }}></td>
                  <td style={tdStyle}>
                    <button onClick={() => { setEditingZs(zs.id); setZsForm({ name: zs.name, startTime: zs.startTime, endTime: zs.endTime, color: zs.color, order: zs.order }); }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', border: 'none' }}>✏️</button>
                    <button onClick={() => deleteZeitslot(zs.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== SCHICHTEN / ZEITSLOTS VERWALTEN ==================== */}
      {activeTab === 'zeitslots-verwalten' && !selectedTournament && (
        <div style={{ padding: 48, textAlign: 'center', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏆</div>
          <div style={{ fontSize: 20, fontWeight: '600', marginBottom: 8, color: '#212529' }}>Bitte ein Turnier auswählen</div>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>Wähle ein Turnier aus, um Job-Slots zu verwalten</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: '600', fontSize: 14 }}>Turnier:</label>
            <select value={selectedTournament || ''} onChange={e => setSelectedTournament(e.target.value ? parseInt(e.target.value) : null)}
              style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, minWidth: 320, fontSize: 14, outline: 'none', background: '#fff' }}>
              <option value="">-- Bitte wählen --</option>
              {tournaments.map(t => (<option key={t.id} value={t.id}>{t.name} ({new Date(t.startDate).toLocaleDateString('de-DE')} – {new Date(t.endDate).toLocaleDateString('de-DE')})</option>))}
            </select>
          </div>
        </div>
      )}

      {activeTab === 'zeitslots-verwalten' && selectedTournament && (
        <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 24 }}>
          <div>
            <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
              <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>{editingSlotId ? '✏️ Job-Slot bearbeiten' : '➕ Neuer Job-Slot'}</h3>
              {selectedTournamentData && (
                <div style={{ marginBottom: 14, padding: 12, background: 'linear-gradient(135deg, ' + shadeColor(adminPrimary, 3) + ' 0%, #e7f3ff 100%)', borderRadius: 10, fontSize: 13, border: '1px solid ' + shadeColor(adminPrimary, 15) }}>
                  <strong>{selectedTournamentData.name}</strong><br />
                  {new Date(selectedTournamentData.startDate).toLocaleDateString('de-DE')} – {new Date(selectedTournamentData.endDate).toLocaleDateString('de-DE')}
                  <div style={{ marginTop: 6, fontSize: 12, color: '#666' }}>{tournamentDays.length} Tage verfügbar</div>
                  <div style={{ marginTop: 4, fontSize: 14 }}>{statusBadge(selectedTournamentData.status)}</div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: 4, fontSize: 13, color: '#495057' }}>Datum *</label>
                  <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: 10, padding: 6, background: '#f8f9fa' }}>
                    {tournamentDays.map(day => {
                      const d = new Date(day);
                      const label = d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
                      return (
                        <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', background: slotForm.dates.includes(day) ? 'linear-gradient(135deg, ' + shadeColor(adminPrimary, 5) + ' 0%, #e7f3ff 100%)' : 'transparent', fontSize: 13, border: slotForm.dates.includes(day) ? '1px solid ' + shadeColor(adminPrimary, 20) : '1px solid transparent' }}>
                          <input type="checkbox" checked={slotForm.dates.includes(day)}
                            onChange={e => {
                              const next = e.target.checked ? [...slotForm.dates, day] : slotForm.dates.filter(d => d !== day);
                              setSlotForm({ ...slotForm, dates: next });
                            }} />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                  {slotForm.dates.length > 0 && (<div style={{ marginTop: 6, fontSize: 12, color: adminPrimary, fontWeight: '600' }}>{slotForm.dates.length} ausgewählt</div>)}
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: 4, fontSize: 13, color: '#495057' }}>Zeitslot *</label>
                  <select value={String(slotForm.zeitslotId)} onChange={e => setSlotForm({ ...slotForm, zeitslotId: e.target.value ? parseInt(e.target.value) : 0 })}
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff' }}>
                    <option value={0}>Zeitslot wählen...</option>
                    {zeitSlots.sort((a, b) => a.order - b.order).map(zs => (<option key={zs.id} value={String(zs.id)}>{zs.name} ({zs.startTime}–{zs.endTime})</option>))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: 4, fontSize: 13, color: '#495057' }}>Arbeitsbereich *</label>
                  <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: 10, padding: 6, background: '#f8f9fa' }}>
                    {arbeitsbereiche.map(ab => (
                      <label key={ab.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', background: slotForm.arbeitsbereichIds.includes(ab.id) ? 'linear-gradient(135deg, ' + shadeColor(adminPrimary, 5) + ' 0%, #e7f3ff 100%)' : 'transparent', fontSize: 13, border: slotForm.arbeitsbereichIds.includes(ab.id) ? '1px solid ' + shadeColor(adminPrimary, 20) : '1px solid transparent' }}>
                        <input type="checkbox" checked={slotForm.arbeitsbereichIds.includes(ab.id)}
                          onChange={e => {
                            const next = e.target.checked ? [...slotForm.arbeitsbereichIds, ab.id] : slotForm.arbeitsbereichIds.filter(id => id !== ab.id);
                            setSlotForm({ ...slotForm, arbeitsbereichIds: next });
                          }} />
                        {ab.icon} {ab.name}
                      </label>
                    ))}
                  </div>
                  {slotForm.arbeitsbereichIds.length > 0 && (() => {
                    const mins = slotForm.arbeitsbereichIds.map(id => arbeitsbereiche.find(a => a.id === id)?.minVolunteers || 0).filter(Boolean);
                    const maxs = slotForm.arbeitsbereichIds.map(id => arbeitsbereiche.find(a => a.id === id)?.maxVolunteers || 0).filter(Boolean);
                    if (mins.length === 0) return null;
                    const minStr = mins.length === maxs.length && mins.every((v, i) => v === maxs[i]) ? String(mins[0]) : (mins.length === maxs.length ? mins.join('–') + ' / ' + maxs.join('–') : '–');
                    return (<div style={{ marginTop: 8, padding: 10, background: 'linear-gradient(135deg, ' + shadeColor(adminAccent, 3) + ' 0%, #fff3cd 100%)', borderRadius: 10, fontSize: 13, color: '#856404', border: '1px solid #ffeeba' }}>Helfer: {mins.length === maxs.length && mins.every((v, i) => v === maxs[i]) ? mins[0] + '–' + maxs[0] : 'variiert je Bereich'} (max je nach Bereich)</div>);
                  })()}
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: 4, fontSize: 13, color: '#495057' }}>Beschreibung</label>
                  <input type="text" value={slotForm.description} onChange={e => setSlotForm({ ...slotForm, description: e.target.value })} placeholder="Optional..."
                    style={{ width: '100%', padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={saveSlot} style={{ flex: 1, padding: '12px 16px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 15, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>{editingSlotId ? '💾 Speichern' : '➕ Hinzufügen'} ({slotForm.dates.length}×{slotForm.arbeitsbereichIds.length})</button>
                {editingSlotId && <button onClick={() => { setEditingSlotId(null); setSlotForm({ dates: [], zeitslotId: 0, arbeitsbereichIds: [], description: '' }); }} style={{ padding: '12px 16px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14 }}>❌ Abbrechen</button>}
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 18, fontWeight: '600', color: '#212529', marginBottom: 16 }}>📋 Alle Job-Slots ({jobSlots.length})</h4>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <select value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff' }}>
                <option value="">Alle Daten</option>
                {Array.from(new Set(jobSlots.map(s => new Date(s.date).toLocaleDateString('de-DE')))).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select value={filterAb} onChange={e => setFilterAb(e.target.value)} style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff' }}>
                <option value="">Alle Bereiche</option>
                {arbeitsbereiche.map(ab => <option key={ab.id} value={String(ab.id)}>{ab.icon} {ab.name}</option>)}
              </select>
              <input type="text" placeholder="Suche..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
                style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', flex: 1, minWidth: 180 }} />
            </div>
            <div style={{ maxHeight: 500, overflowY: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #e9ecef', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ ...thStyle, padding: '12px 14px' }}>Datum</th>
                    <th style={{ ...thStyle, padding: '12px 14px' }}>Zeitslot</th>
                    <th style={{ ...thStyle, padding: '12px 14px' }}>Bereich</th>
                    <th style={{ ...thStyle, padding: '12px 14px' }}>Helfer</th>
                    <th style={{ ...thStyle, padding: '12px 14px' }}>Beschreibung</th>
                    <th style={{ ...thStyle, padding: '12px 14px' }}>Status</th>
                    <th style={{ ...thStyle, padding: '12px 14px' }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSlots.map(slot => {
                    const info = slotVolunteerCounts[slot.id];
                    const statusColor = !info || info.count === 0 ? '#dc3545' : info.status === 'full' ? '#198754' : '#ffc107';
                    const statusEmoji = !info || info.count === 0 ? '🔴' : info.status === 'full' ? '🟢' : '🟡';
                    return (
                      <tr key={slot.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ ...tdStyle, padding: '12px 14px', whiteSpace: 'nowrap', fontWeight: '600' }}>{new Date(slot.date).toLocaleDateString('de-DE')}</td>
                        <td style={{ ...tdStyle, padding: '12px 14px' }}>
                          {slot.zeitslotId ? (<span style={{ background: getZsColor(slot.zeitslotId), color: '#fff', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: '600' }}>{getZsLabel(slot.zeitslotId)}</span>) : '–'}
                        </td>
                        <td style={{ ...tdStyle, padding: '12px 14px' }}>
                          {slot.arbeitsbereichId ? (<span style={{ background: getAbColor(slot.arbeitsbereichId), color: '#fff', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: '600' }}>{getAbIcon(slot.arbeitsbereichId)} {getAbName(slot.arbeitsbereichId)}</span>) : '–'}
                        </td>
                        <td style={{ ...tdStyle, padding: '12px 14px', textAlign: 'center', fontWeight: '600' }}>
                          {info ? `${info.count}/${slot.maxVolunteers}` : <span style={{ color: '#adb5bd' }}>0/{slot.maxVolunteers}</span>}
                        </td>
                        <td style={{ ...tdStyle, padding: '12px 14px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{slot.description || '–'}</td>
                        <td style={{ ...tdStyle, padding: '12px 14px', textAlign: 'center', fontSize: 18 }}>{statusEmoji}</td>
                        <td style={{ ...tdStyle, padding: '12px 14px', textAlign: 'center' }}>
                          <button onClick={e => { e.stopPropagation(); startEditSlot(slot); }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', border: 'none', marginRight: 6 }}>✏️</button>
                          <button onClick={e => { e.stopPropagation(); deleteSlot(slot.id); }} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}>🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSlots.length === 0 && (
                    <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#666', padding: 24 }}>{jobSlots.length === 0 ? 'Noch keine Job-Slots angelegt.' : 'Keine Treffer für die Filter.'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== VEREINE-VERWALTUNG ==================== */}
      {activeTab === 'clubs' && (
        <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
          <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>🏅 Vereins-Verwaltung</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <input placeholder="Verein-Name" value={clubForm.name} onChange={e => setClubForm(f => ({ ...f, name: e.target.value }))} style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', width: 220 }} />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <label style={{ fontSize: 12, color: '#495057', fontWeight: '600' }}>Primary</label>
              <input type="color" value={clubForm.primaryColor} onChange={e => setClubForm(f => ({ ...f, primaryColor: e.target.value }))} style={{ width: 36, height: 32, border: '1px solid #dee2e6', borderRadius: 8, cursor: 'pointer', padding: 0 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <label style={{ fontSize: 12, color: '#495057', fontWeight: '600' }}>Secondary</label>
              <input type="color" value={clubForm.secondaryColor} onChange={e => setClubForm(f => ({ ...f, secondaryColor: e.target.value }))} style={{ width: 36, height: 32, border: '1px solid #dee2e6', borderRadius: 8, cursor: 'pointer', padding: 0 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <label style={{ fontSize: 12, color: '#495057', fontWeight: '600' }}>Accent</label>
              <input type="color" value={clubForm.accentColor} onChange={e => setClubForm(f => ({ ...f, accentColor: e.target.value }))} style={{ width: 36, height: 32, border: '1px solid #dee2e6', borderRadius: 8, cursor: 'pointer', padding: 0 }} />
            </div>
            <label style={{ padding: '10px 16px', background: '#f8f9fa', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: '600', border: '1px solid #dee2e6' }}>
              📷 Logo hochladen
              <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </label>
            {clubForm.logo && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#495057' }}>
                <span style={{ fontWeight: '600' }}>🎨 Vorschlag:</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: clubForm.primaryColor, border: '1px solid #dee2e6' }} />
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: clubForm.secondaryColor, border: '1px solid #dee2e6' }} />
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: clubForm.accentColor, border: '1px solid #dee2e6' }} />
                </div>
              </div>
            )}
            <button onClick={saveClub} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>{editingClub ? '💾 Speichern' : '➕ Verein'}</button>
            {editingClub && <button onClick={() => { setEditingClub(null); setClubForm({ name: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' }); setClubLogo(null); }} style={{ padding: '10px 20px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600' }}>Abbrechen</button>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={thStyle}>Logo</th><th style={thStyle}>Name</th><th style={thStyle}>Farben</th><th style={thStyle}>Aktion</th></tr></thead>
            <tbody>
              {clubs.map(club => (
                <tr key={club.id}>
                  <td style={tdStyle}>
                    {club.logo ? (
                      <img src={club.logo} alt={club.name} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: club.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
                        {club.name.charAt(0)}
                      </div>
                    )}
                  </td>
                  <td style={tdStyle}>{club.name}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: club.primaryColor, border: '1px solid #dee2e6' }} title="Primary" />
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: club.secondaryColor, border: '1px solid #dee2e6' }} title="Secondary" />
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: club.accentColor, border: '1px solid #dee2e6' }} title="Accent" />
                    </div>
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap', borderTopRightRadius: 12 }}>
                    <button onClick={() => startEditClub(club)} style={{ ...btnStyle, border: 'none', background: '#fff3cd', color: '#856404' }}>✏️</button>
                    <button onClick={() => deleteClub(club.id)} style={{ ...btnStyle, border: 'none', background: '#ffe3e3', color: '#dc3545' }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== ÜBERSICHT ==================== */}
      {activeTab === 'uebersicht' && !selectedTournament && (
        <div style={{ padding: 48, textAlign: 'center', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 20, fontWeight: '600', marginBottom: 8, color: '#212529' }}>Bitte ein Turnier auswählen</div>
          <div style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>Wähle ein Turnier aus, um die Übersicht zu sehen</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: '600', fontSize: 14 }}>Turnier:</label>
            <select value={selectedTournament || ''} onChange={e => setSelectedTournament(e.target.value ? parseInt(e.target.value) : null)}
              style={{ padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, minWidth: 320, fontSize: 14, outline: 'none', background: '#fff' }}>
              <option value="">-- Bitte wählen --</option>
              {tournaments.map(t => (<option key={t.id} value={t.id}>{t.name} ({new Date(t.startDate).toLocaleDateString('de-DE')} – {new Date(t.endDate).toLocaleDateString('de-DE')})</option>))}
            </select>
          </div>
        </div>
      )}

      {activeTab === 'uebersicht' && selectedTournament && (() => {
        const grouped: Record<string, Shift[]> = {};
        jobSlots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(slot => {
          const dateKey = new Date(slot.date).toLocaleDateString('de-DE');
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(slot);
        });
        return Object.entries(grouped).map(([dateStr, slots]) => {
          const firstSlot = slots[0];
          const firstDate = new Date(firstSlot.date);
          const dayName = firstDate.toLocaleDateString('de-DE', { weekday: 'long' });
          return (
            <div key={dateStr} style={{ marginBottom: 24 }}>
              <h4 style={{ background: '#f8f9fa', padding: '14px 18px', borderRadius: 10, marginTop: 0, fontSize: 16, fontWeight: '600' }}>
                📅 {dateStr} ({dayName})
                <span style={{ float: 'right', fontSize: 14, color: '#666' }}>{slots.length} Schichten</span>
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, borderTopLeftRadius: 12 }}>Zeitslot</th>
                    <th style={thStyle}>Bereich</th>
                    <th style={thStyle}>Belegt</th>
                    <th style={{ ...thStyle, borderTopRightRadius: 12 }}>Max. Helfer</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map(slot => (
                    <tr key={slot.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ ...tdStyle, fontWeight: '600' }}>
                        {slot.zeitslotId ? (<span style={{ background: getZsColor(slot.zeitslotId), color: '#fff', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: '600' }}>{getZsLabel(slot.zeitslotId)}</span>) : <span style={{ color: '#adb5bd' }}>–</span>}
                      </td>
                      <td style={tdStyle}>
                        {slot.arbeitsbereichId ? (<span style={{ background: getAbColor(slot.arbeitsbereichId), color: '#fff', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: '600' }}>{getAbIcon(slot.arbeitsbereichId)} {getAbName(slot.arbeitsbereichId)}</span>) : '–'}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600' }}>
                        {(() => {
                          const info = slotVolunteerCounts[slot.id];
                          if (!info) return <span style={{ color: '#adb5bd' }}>🔴 0/{slot.maxVolunteers}</span>;
                          const color = info.status === 'full' ? '#198754' : info.status === 'partial' ? '#ffc107' : '#dc3545';
                          const emoji = info.status === 'full' ? '🟢' : info.status === 'partial' ? '🟡' : '🔴';
                          return <span style={{ color, fontWeight: 'bold' }}>{emoji} {info.count}/{slot.maxVolunteers}</span>;
                        })()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600' }}>{slot.maxVolunteers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        });
      })()}

      {/* Status-Dialog */}
      {statusDialog.open && statusDialog.tournament && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={closeStatusDialog}>
          <div style={{ background: '#fff', padding: 28, borderRadius: 16, minWidth: 420, maxWidth: 520, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, fontSize: 20, fontWeight: '600', color: '#212529' }}>📝 {statusDialog.tournament.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 13, color: '#495057', display: 'block', marginBottom: 6, fontWeight: '600' }}>Name</label>
                <input value={statusDialog.editName} onChange={e => setStatusDialog({ ...statusDialog, editName: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#495057', display: 'block', marginBottom: 6, fontWeight: '600' }}>Ausrichtender Verein</label>
                <select value={statusDialog.editClubId} onChange={e => setStatusDialog({ ...statusDialog, editClubId: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                  <option value="">-- Kein Verein --</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, color: '#495057', display: 'block', marginBottom: 6, fontWeight: '600' }}>Von</label>
                  <input type="date" value={statusDialog.editStart} onChange={e => setStatusDialog({ ...statusDialog, editStart: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, color: '#495057', display: 'block', marginBottom: 6, fontWeight: '600' }}>Bis</label>
                  <input type="date" value={statusDialog.editEnd} onChange={e => setStatusDialog({ ...statusDialog, editEnd: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: '#495057', display: 'block', marginBottom: 8, fontWeight: '600' }}>Status</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => updateTournamentStatus('aktiv')} style={{ flex: 1, padding: '12px 14px', background: statusDialog.tournament.status === 'aktiv' ? '#d1e7dd' : '#f8f9fa', color: statusDialog.tournament.status === 'aktiv' ? '#0f5132' : '#333', border: statusDialog.tournament.status === 'aktiv' ? '1px solid #a3cfbb' : '1px solid #dee2e6', borderRadius: 10, cursor: 'pointer', fontWeight: '600' }}>🟢 Aktiv</button>
                <button onClick={() => updateTournamentStatus('beendet')} style={{ flex: 1, padding: '12px 14px', background: statusDialog.tournament.status === 'beendet' ? '#fff3cd' : '#f8f9fa', color: statusDialog.tournament.status === 'beendet' ? '#856404' : '#333', border: statusDialog.tournament.status === 'beendet' ? '1px solid #ffe69c' : '1px solid #dee2e6', borderRadius: 10, cursor: 'pointer', fontWeight: '600' }}>🟡 Beendet</button>
                <button onClick={() => updateTournamentStatus('archiviert')} style={{ flex: 1, padding: '12px 14px', background: statusDialog.tournament.status === 'archiviert' ? '#e2e3e5' : '#f8f9fa', color: statusDialog.tournament.status === 'archiviert' ? '#41464b' : '#333', border: statusDialog.tournament.status === 'archiviert' ? '1px solid #c6c8cb' : '1px solid #dee2e6', borderRadius: 10, cursor: 'pointer', fontWeight: '600' }}>⚪ Archiviert</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveTournamentEdit} style={{ flex: 1, padding: '12px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>💾 Speichern</button>
              <button onClick={closeStatusDialog} style={{ flex: 1, padding: '12px', background: '#f8f9fa', color: '#333', border: '1px solid #dee2e6', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14 }}>Abbrechen</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ textAlign: 'center', padding: '24px 0', color: '#adb5bd', fontSize: 13 }}>
        <p style={{ margin: 0 }}>Turnierplaner · Vereinsverwaltung</p>
      </div>
    </div>
  );
}
