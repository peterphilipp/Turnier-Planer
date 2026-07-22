import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTournaments } from './api';

import SelfServiceView from './components/SelfServiceView';
import TournamentView from './components/TournamentView';

import Turniere from './components/admin/stammdaten/Turniere';
import Arbeitsbereiche from './components/admin/stammdaten/Arbeitsbereiche';
import Zeitslots from './components/admin/stammdaten/Zeitslots';
import Helfer from './components/admin/stammdaten/Helfer';
import Vereine from './components/admin/stammdaten/Vereine';
import Lebensmittel from './components/admin/stammdaten/Lebensmittel';
import Jahrgaenge from './components/admin/stammdaten/Jahrgaenge';

import Jobslots from './components/admin/organisation/Jobslots';
import Buchungen from './components/admin/organisation/Buchungen';
import Uebersicht from './components/admin/organisation/Uebersicht';
import LebensmittelSlots from './components/admin/organisation/LebensmittelSlots';
import { Tournament } from './components/admin/shared';

type View = 'admin' | 'selfservice';
type MainTab = 'spielplan' | 'organisation' | 'stammdaten';
type OrgTab = 'uebersicht' | 'jobslots' | 'buchungen' | 'lebensmittel-slots';
type StammTab = 'turniere' | 'vereine' | 'arbeitsbereiche' | 'zeitslots' | 'helfer' | 'lebensmittel' | 'jahrgaenge';

export default function App() {
  const [view, setView] = useState<View>('selfservice');
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('spielplan');
  
  const [activeOrgTab, setActiveOrgTab] = useState<OrgTab>('uebersicht');
  const [activeStammTab, setActiveStammTab] = useState<StammTab>('turniere');
  
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  
  const { data: tournaments = [] } = useQuery<Tournament[]>({ queryKey: ['tournaments'], queryFn: getTournaments });

  useEffect(() => {
    const active = tournaments.find(t => t.status === 'aktiv');
    if (active && !selectedTournamentId) {
      setSelectedTournamentId(active.id);
    }
  }, [tournaments, selectedTournamentId]);

  if (view === 'selfservice') {
    return (
      <div>
        <SelfServiceView />
        <div style={{ textAlign: 'center', padding: 20 }}>
          <button
            onClick={() => setView('admin')}
            style={{
              padding: '8px 16px',
              background: '#e9ecef',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              color: '#666'
            }}
          >
            ⚙️ Admin-Bereich
          </button>
        </div>
      </div>
    );
  }

  const primaryColor = '#0d6efd';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>⚽ Turnierplaner – Admin</h1>
        <button
          onClick={() => setView('selfservice')}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13
          }}
        >
          ← Helfer-Bereich
        </button>
      </div>

      {/* LEVEL 1: HAUPT-NAVIGATION */}
      <nav style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', borderBottom: '2px solid #dee2e6', paddingBottom: 10 }}>
        <button onClick={() => setActiveMainTab('spielplan')}
          style={{ padding: '10px 20px', cursor: 'pointer', background: activeMainTab === 'spielplan' ? primaryColor : 'transparent', color: activeMainTab === 'spielplan' ? '#fff' : '#495057', border: 'none', borderRadius: 8, fontWeight: 'bold', fontSize: 15 }}>
          🏆 Spielplanmanagement
        </button>
        <button onClick={() => setActiveMainTab('organisation')}
          style={{ padding: '10px 20px', cursor: 'pointer', background: activeMainTab === 'organisation' ? primaryColor : 'transparent', color: activeMainTab === 'organisation' ? '#fff' : '#495057', border: 'none', borderRadius: 8, fontWeight: 'bold', fontSize: 15 }}>
          📋 Organisationsmanagement
        </button>
        <button onClick={() => setActiveMainTab('stammdaten')}
          style={{ padding: '10px 20px', cursor: 'pointer', background: activeMainTab === 'stammdaten' ? primaryColor : 'transparent', color: activeMainTab === 'stammdaten' ? '#fff' : '#495057', border: 'none', borderRadius: 8, fontWeight: 'bold', fontSize: 15 }}>
          ⚙️ Stammdaten
        </button>
      </nav>

      {/* LEVEL 2: SUB-NAVIGATION */}
      {activeMainTab === 'organisation' && (
        <div>
          {/* Turnierauswahl */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <label style={{ fontWeight: 'bold', fontSize: 13 }}>Aktives Turnier:</label>
            <select
              value={selectedTournamentId || ''}
              onChange={e => setSelectedTournamentId(e.target.value ? parseInt(e.target.value) : null)}
              style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 6, minWidth: 280 }}
            >
              <option value="">-- Bitte wählen --</option>
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({new Date(t.startDate).toLocaleDateString('de-DE')})</option>
              ))}
            </select>
          </div>
          <nav style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button onClick={() => setActiveOrgTab('uebersicht')}
              style={{ padding: '6px 16px', cursor: 'pointer', background: activeOrgTab === 'uebersicht' ? '#198754' : '#e9ecef', color: activeOrgTab === 'uebersicht' ? '#fff' : '#000', border: 'none', borderRadius: 6, fontSize: 14 }}>
              Übersicht
            </button>
            <button onClick={() => setActiveOrgTab('buchungen')}
              style={{ padding: '6px 16px', cursor: 'pointer', background: activeOrgTab === 'buchungen' ? '#198754' : '#e9ecef', color: activeOrgTab === 'buchungen' ? '#fff' : '#000', border: 'none', borderRadius: 6, fontSize: 14 }}>
              Dienstplan & Zuweisung
            </button>
            <button onClick={() => setActiveOrgTab('jobslots')}
              style={{ padding: '6px 16px', cursor: 'pointer', background: activeOrgTab === 'jobslots' ? '#198754' : '#e9ecef', color: activeOrgTab === 'jobslots' ? '#fff' : '#000', border: 'none', borderRadius: 6, fontSize: 14 }}>
              Job-Slots
            </button>
            <button onClick={() => setActiveOrgTab('lebensmittel-slots')}
              style={{ padding: '6px 16px', cursor: 'pointer', background: activeOrgTab === 'lebensmittel-slots' ? '#198754' : '#e9ecef', color: activeOrgTab === 'lebensmittel-slots' ? '#fff' : '#000', border: 'none', borderRadius: 6, fontSize: 14 }}>
              Lebensmittel-Slots
            </button>
          </nav>
        </div>
      )}

      {activeMainTab === 'stammdaten' && (
        <nav style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setActiveStammTab('turniere')} style={{ padding: '6px 16px', cursor: 'pointer', background: activeStammTab === 'turniere' ? '#6c757d' : '#e9ecef', color: activeStammTab === 'turniere' ? '#fff' : '#000', border: 'none', borderRadius: 6 }}>Turniere</button>
          <button onClick={() => setActiveStammTab('vereine')} style={{ padding: '6px 16px', cursor: 'pointer', background: activeStammTab === 'vereine' ? '#6c757d' : '#e9ecef', color: activeStammTab === 'vereine' ? '#fff' : '#000', border: 'none', borderRadius: 6 }}>Vereine</button>
          <button onClick={() => setActiveStammTab('arbeitsbereiche')} style={{ padding: '6px 16px', cursor: 'pointer', background: activeStammTab === 'arbeitsbereiche' ? '#6c757d' : '#e9ecef', color: activeStammTab === 'arbeitsbereiche' ? '#fff' : '#000', border: 'none', borderRadius: 6 }}>Arbeitsbereiche</button>
          <button onClick={() => setActiveStammTab('zeitslots')} style={{ padding: '6px 16px', cursor: 'pointer', background: activeStammTab === 'zeitslots' ? '#6c757d' : '#e9ecef', color: activeStammTab === 'zeitslots' ? '#fff' : '#000', border: 'none', borderRadius: 6 }}>Zeitslots</button>
          <button onClick={() => setActiveStammTab('helfer')} style={{ padding: '6px 16px', cursor: 'pointer', background: activeStammTab === 'helfer' ? '#6c757d' : '#e9ecef', color: activeStammTab === 'helfer' ? '#fff' : '#000', border: 'none', borderRadius: 6 }}>Helfer (Personal)</button>
          <button onClick={() => setActiveStammTab('jahrgaenge')} style={{ padding: '6px 16px', cursor: 'pointer', background: activeStammTab === 'jahrgaenge' ? '#6c757d' : '#e9ecef', color: activeStammTab === 'jahrgaenge' ? '#fff' : '#000', border: 'none', borderRadius: 6 }}>📅 Jahrgänge</button>
          <button onClick={() => setActiveStammTab('lebensmittel')} style={{ padding: '6px 16px', cursor: 'pointer', background: activeStammTab === 'lebensmittel' ? '#6c757d' : '#e9ecef', color: activeStammTab === 'lebensmittel' ? '#fff' : '#000', border: 'none', borderRadius: 6 }}>🍞 Lebensmittel</button>
        </nav>
      )}

      {/* CONTENT AREA */}
      <main>
        {activeMainTab === 'spielplan' && <TournamentView />}
        
        {activeMainTab === 'organisation' && activeOrgTab === 'uebersicht' && <Uebersicht selectedTournament={selectedTournamentId} />}
        {activeMainTab === 'organisation' && activeOrgTab === 'buchungen' && <Buchungen selectedTournament={selectedTournamentId} adminPrimary="#198754" />}
        {activeMainTab === 'organisation' && activeOrgTab === 'jobslots' && <Jobslots selectedTournament={selectedTournamentId} tournament={tournaments.find(t => t.id === selectedTournamentId) || null} adminPrimary="#198754" />}
        {activeMainTab === 'organisation' && activeOrgTab === 'lebensmittel-slots' && <LebensmittelSlots selectedTournament={selectedTournamentId} tournament={tournaments.find(t => t.id === selectedTournamentId) || null} adminPrimary="#198754" />}

        {activeMainTab === 'stammdaten' && activeStammTab === 'turniere' && <Turniere adminPrimary="#6c757d" adminSecondary="#adb5bd" />}
        {activeMainTab === 'stammdaten' && activeStammTab === 'vereine' && <Vereine adminPrimary="#6c757d" />}
        {activeMainTab === 'stammdaten' && activeStammTab === 'arbeitsbereiche' && <Arbeitsbereiche adminPrimary="#6c757d" />}
        {activeMainTab === 'stammdaten' && activeStammTab === 'zeitslots' && <Zeitslots adminPrimary="#6c757d" />}
        {activeMainTab === 'stammdaten' && activeStammTab === 'helfer' && <Helfer adminPrimary="#6c757d" tournamentId={selectedTournamentId} />}
        {activeMainTab === 'stammdaten' && activeStammTab === 'jahrgaenge' && <Jahrgaenge adminPrimary="#6c757d" />}
        {activeMainTab === 'stammdaten' && activeStammTab === 'lebensmittel' && <Lebensmittel adminPrimary="#6c757d" />}
      </main>
    </div>
  );
}
