import { useState, useEffect } from 'react';
import { ModalRoot } from './components/admin/Modal';
import { useQuery } from '@tanstack/react-query';
import { getTournaments } from './api';

import SelfServiceView from './components/SelfServiceView';
import TournamentView from './components/TournamentView';
import Privacy from './components/Privacy';

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
import Spielplan from './components/admin/organisation/Spielplan';
import LebensmittelSlots from './components/admin/organisation/LebensmittelSlots';
import TurnierTage from './components/admin/organisation/TurnierTage';
import GruppenTeams from './components/admin/organisation/GruppenTeams';
import Teilnehmer from './components/admin/organisation/Teilnehmer';
import Felder from './components/admin/organisation/Felder';
import TurnierModus from './components/admin/organisation/TurnierModus';
import { Tournament } from './components/admin/shared';

type View = 'admin' | 'selfservice' | 'privacy';
type MainTab = 'spielplan' | 'organisation' | 'stammdaten';
type SpielplanTab = 'teilnehmer' | 'felder' | 'turnier-tage' | 'gruppen-teams' | 'spielplan' | 'modus';
type OrgTab = 'uebersicht' | 'jobslots' | 'buchungen' | 'lebensmittel-slots';
type StammTab = 'turniere' | 'vereine' | 'arbeitsbereiche' | 'zeitslots' | 'helfer' | 'lebensmittel' | 'jahrgaenge';

export default function App() {
  // View basierend auf URL/Hostname vorinitialisieren
  const getInitialView = (): View => {
    if (typeof window === 'undefined') return 'selfservice';
    // Query-Parameter hat Vorrang
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'admin') return 'admin';
    if (viewParam === 'privacy') return 'privacy';
    if (viewParam === 'selfservice') return 'selfservice';
    // Sonst nach Hostname schauen
    const host = window.location.hostname.toLowerCase();
    if (host.includes('admin')) return 'admin';
    return 'selfservice';
  };

  const [view, setView] = useState<View>(getInitialView());
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('spielplan');
  
  const [activeSpielplanTab, setActiveSpielplanTab] = useState<SpielplanTab>('turnier-tage');
  const [activeOrgTab, setActiveOrgTab] = useState<OrgTab>('uebersicht');
  const [activeStammTab, setActiveStammTab] = useState<StammTab>('turniere');
  
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [selectedYearGroupId, setSelectedYearGroupId] = useState<number | null>(null);
  
  const { data: tournaments = [] } = useQuery<Tournament[]>({ queryKey: ['tournaments'], queryFn: getTournaments });

  useEffect(() => {
    const active = tournaments.find(t => t.status === 'aktiv');
    if (active && !selectedTournamentId) {
      setSelectedTournamentId(active.id);
    }
  }, [tournaments, selectedTournamentId]);

  // URL beim View-Wechsel aktualisieren
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (view === 'admin') params.set('view', 'admin');
      else if (view === 'privacy') params.set('view', 'privacy');
      else params.delete('view');
      const url = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      window.history.replaceState({}, '', url);
    }
  }, [view]);

  if (view === 'privacy') {
    return <Privacy />;
  }

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
          <br />
          <a href="?view=privacy" style={{ fontSize: 12, color: '#999', textDecoration: 'underline' }}>
            Datenschutzerklärung
          </a>
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
        <a href="?view=privacy" style={{ fontSize: 12, color: '#6c757d', textDecoration: 'underline' }}>
          Datenschutzerklärung
        </a>
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

      {/* LEVEL 2: SUB-NAVIGATION – SPIELPLAN */}
      {activeMainTab === 'spielplan' && (
        <div>
          {/* Turnierauswahl + Jahrgang */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontWeight: 'bold', fontSize: 13 }}>Turnier:</label>
              <select
                value={selectedTournamentId || ''}
                onChange={e => { setSelectedTournamentId(e.target.value ? parseInt(e.target.value) : null); setSelectedYearGroupId(null); }}
                style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 6, minWidth: 280 }}
              >
                <option value="">-- Bitte wählen --</option>
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            {selectedTournamentId && (() => {
              const tournament = tournaments.find(t => t.id === selectedTournamentId);
              if (!tournament || !tournament.yearGroups?.length) return null;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ fontWeight: 'bold', fontSize: 13 }}>📅 Jahrgang:</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {tournament.yearGroups.map(yg => (
                      <button
                        key={yg.id}
                        onClick={() => setSelectedYearGroupId(selectedYearGroupId === yg.id ? null : yg.id)}
                        style={{
                          padding: '5px 14px',
                          cursor: 'pointer',
                          background: selectedYearGroupId === yg.id ? '#0d6efd' : '#e9ecef',
                          color: selectedYearGroupId === yg.id ? '#fff' : '#333',
                          border: 'none',
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: selectedYearGroupId === yg.id ? 'bold' : 'normal'
                        }}
                      >
                        {yg.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
          <nav style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button onClick={() => setActiveSpielplanTab('teilnehmer')}
              style={{ padding: '6px 16px', cursor: 'pointer', background: activeSpielplanTab === 'teilnehmer' ? '#0d6efd' : '#e9ecef', color: activeSpielplanTab === 'teilnehmer' ? '#fff' : '#000', border: 'none', borderRadius: 6, fontSize: 14 }}>
              📋 Teilnehmer
            </button>
            <button onClick={() => setActiveSpielplanTab('felder')}
              style={{ padding: '6px 16px', cursor: 'pointer', background: activeSpielplanTab === 'felder' ? '#0d6efd' : '#e9ecef', color: activeSpielplanTab === 'felder' ? '#fff' : '#000', border: 'none', borderRadius: 6, fontSize: 14 }}>
              ⚽ Spielfelder
            </button>
            <button onClick={() => setActiveSpielplanTab('turnier-tage')}
              style={{ padding: '6px 16px', cursor: 'pointer', background: activeSpielplanTab === 'turnier-tage' ? '#0d6efd' : '#e9ecef', color: activeSpielplanTab === 'turnier-tage' ? '#fff' : '#000', border: 'none', borderRadius: 6, fontSize: 14 }}>
              📅 Turnier-Tage
            </button>
            <button onClick={() => setActiveSpielplanTab('gruppen-teams')}
              style={{ padding: '6px 16px', cursor: 'pointer', background: activeSpielplanTab === 'gruppen-teams' ? '#0d6efd' : '#e9ecef', color: activeSpielplanTab === 'gruppen-teams' ? '#fff' : '#000', border: 'none', borderRadius: 6, fontSize: 14 }}>
              👥 Gruppen & Teams
            </button>
            <button onClick={() => setActiveSpielplanTab('modus')}
              style={{ padding: '6px 16px', cursor: 'pointer', background: activeSpielplanTab === 'modus' ? '#0d6efd' : '#e9ecef', color: activeSpielplanTab === 'modus' ? '#fff' : '#000', border: 'none', borderRadius: 6, fontSize: 14 }}>
              ⚙️ Turnier-Modus
            </button>
            <button onClick={() => setActiveSpielplanTab('spielplan')}
              style={{ padding: '6px 16px', cursor: 'pointer', background: activeSpielplanTab === 'spielplan' ? '#0d6efd' : '#e9ecef', color: activeSpielplanTab === 'spielplan' ? '#fff' : '#000', border: 'none', borderRadius: 6, fontSize: 14 }}>
              ⚽ Spielplan
            </button>
          </nav>
        </div>
      )}

      {/* LEVEL 2: SUB-NAVIGATION – ORGANISATION */}
      {activeMainTab === 'organisation' && (
        <div>
          {/* Turnierauswahl */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
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
        {activeMainTab === 'spielplan' && activeSpielplanTab === 'teilnehmer' && <Teilnehmer tournamentId={selectedTournamentId} yearGroupId={selectedYearGroupId} tournament={tournaments.find(t => t.id === selectedTournamentId) || null} />}
        {activeMainTab === 'spielplan' && activeSpielplanTab === 'felder' && <Felder tournamentId={selectedTournamentId} yearGroupId={selectedYearGroupId} />}
        {activeMainTab === 'spielplan' && activeSpielplanTab === 'turnier-tage' && <TurnierTage tournamentId={selectedTournamentId} />}
        {activeMainTab === 'spielplan' && activeSpielplanTab === 'gruppen-teams' && <GruppenTeams tournamentId={selectedTournamentId} yearGroupId={selectedYearGroupId} />}
        {activeMainTab === 'spielplan' && activeSpielplanTab === 'modus' && <TurnierModus tournament={tournaments.find(t => t.id === selectedTournamentId) || null} selectedYearGroupId={selectedYearGroupId} yearGroups={(tournaments.find(t => t.id === selectedTournamentId)?.yearGroups as any) || []} />}
        {activeMainTab === 'spielplan' && activeSpielplanTab === 'spielplan' && <Spielplan tournamentId={selectedTournamentId} yearGroupId={selectedYearGroupId} />}
        
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
      <ModalRoot />
    </div>
  );
}
