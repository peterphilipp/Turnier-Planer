import { useState, useEffect, useCallback } from 'react';
import { ModalRoot } from './components/admin/Modal';
import { useQuery } from '@tanstack/react-query';
import { getTournaments, setAuthToken, ApiError } from './api';

import SelfServiceView from './components/SelfServiceView';
import Privacy from './components/Privacy';

import Turniere from './components/admin/stammdaten/Turniere';
import WorkAreas from './components/admin/stammdaten/WorkAreas';
import GlobalTimeSlots from './components/admin/stammdaten/GlobalTimeSlots';
import Helfer from './components/admin/stammdaten/Helfer';
import Vereine from './components/admin/stammdaten/Vereine';
import Lebensmittel from './components/admin/stammdaten/Lebensmittel';
import Jahrgaenge from './components/admin/stammdaten/Jahrgaenge';

import Jobslots from './components/admin/organisation/Jobslots';
import Buchungen from './components/admin/organisation/Buchungen';
import Uebersicht from './components/admin/organisation/Uebersicht';
import Spielplan from './components/admin/organisation/Spielplan';
import FoodDonationSlots from './components/admin/organisation/FoodDonationSlots';
import TurnierTage from './components/admin/organisation/TurnierTage';

import Teilnehmer from './components/admin/organisation/Teilnehmer';
import Felder from './components/admin/organisation/Felder';
import TurnierModus from './components/admin/organisation/TurnierModus';
import { Tournament } from './components/admin/shared';
import { UserProvider, useUser } from './context/UserContext';

type View = 'admin' | 'selfservice' | 'privacy';
type MainTab = 'spielplan' | 'organisation' | 'stammdaten';
type SpielplanTab = 'teilnehmer' | 'felder' | 'turnier-tage' | 'gruppen-teams' | 'spielplan-gruppenphase' | 'spielplan-ko' | 'modus' | 'gruppen-verwalten';
type OrgTab = 'uebersicht' | 'jobslots' | 'buchungen' | 'food-donation-slots';
type StammTab = 'turniere' | 'vereine' | 'work-areas' | 'global-time-slots' | 'helfer' | 'lebensmittel' | 'jahrgaenge';

// ===================== Admin UI mit Rollen-Check =====================
function AdminView() {
  const { isAdmin, isOrganizer, token, login, logout } = useUser();
  const [view, setView] = useState<View>('admin');
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('spielplan');
  
  const [activeSpielplanTab, setActiveSpielplanTab] = useState<SpielplanTab>('turnier-tage');
  const [activeOrgTab, setActiveOrgTab] = useState<OrgTab>('uebersicht');
  const [activeStammTab, setActiveStammTab] = useState<StammTab>('turniere');
  
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [selectedYearGroupId, setSelectedYearGroupId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { data: tournaments = [], isLoading, error: queryError } = useQuery<Tournament[]>({ 
    queryKey: ['tournaments'], 
    queryFn: getTournaments,
    retry: (failureCount, err) => {
      if (err instanceof ApiError && err.status === 401) return false;
      return failureCount < 2;
    }
  });

  // Token synchronisieren
  useEffect(() => {
    if (token) setAuthToken(token);
  }, [token]);

  // Aktives Turnier automatisch auswählen
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

  // 401/403 Fehlerbehandlung
  useEffect(() => {
    if (queryError instanceof ApiError) {
      if (queryError.status === 401) {
        logout();
        setView('selfservice');
      } else {
        setError(queryError.message);
      }
    }
  }, [queryError, logout]);

  const handleAdminClick = () => {
    // Prüfen ob User Admin/Organizer ist
    if (!isAdmin && !isOrganizer) {
      alert('Du hast keine Berechtigung für den Admin-Bereich. Bitte kontaktiere einen Administrator.');
      return;
    }
    setView('admin');
  };

  const primaryColor = '#0d6efd';

  // View-Wechsel nach SelfService/Privacy
  if (view === 'privacy') {
    return <Privacy />;
  }

  if (view === 'selfservice') {
    return (
      <>
        <SelfServiceView onLoginAsAdmin={handleAdminClick} />
        <ModalRoot />
        <div style={{ textAlign: 'center', padding: 20 }}>
          <button
            onClick={handleAdminClick}
            style={{
              padding: '8px 16px',
              background: '#e9ecef',
              border: 'none',
              borderRadius: 6,
              cursor: isAdmin || isOrganizer ? 'pointer' : 'not-allowed',
              fontSize: 13,
              color: (isAdmin || isOrganizer) ? '#666' : '#aaa',
              opacity: (isAdmin || isOrganizer) ? 1 : 0.5
            }}
          >
            ⚙️ Admin-Bereich {!(isAdmin || isOrganizer) && '🔒'}
          </button>
          <br />
          <a href="?view=privacy" style={{ fontSize: 12, color: '#999', textDecoration: 'underline' }}>
            Datenschutzerklärung
          </a>
        </div>
      </>
    );
  }

  // Admin-Bereich – nur für Admin/Organizer sichtbar
  if (!isAdmin && !isOrganizer) {
    return (
      <div style={{ maxWidth: 480, margin: '10vh auto', padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
        <h2 style={{ color: '#333' }}>Zugriff verweigert</h2>
        <p style={{ color: '#666', fontSize: 15 }}>
          Du hast keine Berechtigung für den Admin-Bereich.
          <br />Bitte kontaktiere einen Administrator oder Organisator.
        </p>
        <button
          onClick={() => setView('selfservice')}
          style={{
            padding: '12px 24px',
            background: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 15,
            marginTop: 16
          }}
        >
          ← Zurück zum Helfer-Bereich
        </button>
      </div>
    );
  }

  // Fehleranzeige
  if (error) {
    return (
      <div style={{ maxWidth: 480, margin: '10vh auto', padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: '#dc3545' }}>Fehler</h2>
        <p style={{ color: '#666', fontSize: 15 }}>{error}</p>
        <button
          onClick={() => { setError(null); window.location.reload(); }}
          style={{
            padding: '10px 20px',
            background: '#dc3545',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            marginTop: 12
          }}
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  // Ladezustand
  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>Lade Admin-Bereich...</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.webp" alt="Logo" style={{ height: 40, width: 40, objectFit: 'cover', borderRadius: '22%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
          <h1 style={{ margin: 0 }}>Turnierplaner – Admin</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Rollen-Badge */}
          <span style={{ 
            padding: '4px 12px', 
            background: isAdmin ? '#dc3545' : '#198754', 
            color: '#fff', 
            borderRadius: 12, 
            fontSize: 12, 
            fontWeight: 'bold'
          }}>
            {isAdmin ? '👑 Admin' : '🔧 Organisator'}
          </span>
          
          <a href="?view=privacy" style={{ fontSize: 12, color: '#6c757d', textDecoration: 'underline' }}>
            Datenschutzerklärung
          </a>
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

      {/* KONTEXT-LEISTE FÜR TURNIER UND JAHRGANG */}
      {activeMainTab !== 'stammdaten' && (
        <div style={{ display: 'flex', gap: 16, background: '#f8f9fa', padding: '16px 20px', borderRadius: 12, border: '1px solid #dee2e6', marginBottom: 24, alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 300px' }}>
          <label style={{ fontWeight: 'bold', fontSize: 14, color: '#495057' }}>Aktives Turnier:</label>
          <select
            value={selectedTournamentId || ''}
            onChange={e => { setSelectedTournamentId(e.target.value ? parseInt(e.target.value) : null); setSelectedYearGroupId(null); }}
            style={{ padding: '12px 14px', border: '1px solid #ced4da', borderRadius: 6, minWidth: 200, fontSize: 16, background: '#fff', minHeight: 44, flex: 1 }}
          >
            <option value="">-- Bitte wählen --</option>
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({new Date(t.startDate).toLocaleDateString('de-DE')})</option>
            ))}
          </select>
        </div>

        {/* Sponsor Logo Anzeige */}
        {selectedTournamentId && (() => {
          const tournament = tournaments.find(t => t.id === selectedTournamentId);
          return tournament?.logo ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: '#6c757d' }}>Sponsor:</span>
              <img src={tournament.logo} alt="Sponsor" style={{ maxWidth: 150, maxHeight: 40, objectFit: 'contain', borderRadius: 4 }} />
            </div>
          ) : null;
        })()}

        {selectedTournamentId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 250px' }}>
            <label style={{ fontWeight: 'bold', fontSize: 14, color: '#495057' }}>Jahrgang:</label>
            <select
              value={selectedYearGroupId || ''}
              onChange={e => setSelectedYearGroupId(e.target.value ? parseInt(e.target.value) : null)}
              style={{ padding: '12px 14px', border: '1px solid #ced4da', borderRadius: 6, minWidth: 180, fontSize: 16, background: '#fff', minHeight: 44, flex: 1 }}
            >
              <option value="">-- Alle --</option>
              {tournaments.find(t => t.id === selectedTournamentId)?.yearGroups?.map(yg => (
                <option key={yg.id} value={yg.id}>{yg.name}</option>
              ))}
            </select>
          </div>
        )}
        </div>
      )}

      {/* LEVEL 2: SUB-NAVIGATION – SPIELPLAN */}
      {activeMainTab === 'spielplan' && (
        <nav style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
          {[{ key: 'turnier-tage' as SpielplanTab, icon: '📅', label: 'Turnier-Tage' }, { key: 'felder' as SpielplanTab, icon: '⚽', label: 'Spielfelder' }, { key: 'teilnehmer' as SpielplanTab, icon: '📋', label: 'Teilnehmer' }, { key: 'modus' as SpielplanTab, icon: '⚙️', label: 'Modus' }, { key: 'spielplan-gruppenphase' as SpielplanTab, icon: '📊', label: 'Gruppenphase' }, { key: 'spielplan-ko' as SpielplanTab, icon: '🏆', label: 'KO-Phase' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveSpielplanTab(tab.key)}
              style={{ padding: '12px 16px', cursor: 'pointer', background: activeSpielplanTab === tab.key ? '#0d6efd' : '#e9ecef', color: activeSpielplanTab === tab.key ? '#fff' : '#000', border: 'none', borderRadius: 8, fontSize: 15, minHeight: 44, minWidth: 120, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* LEVEL 2: SUB-NAVIGATION – ORGANISATION */}
      {activeMainTab === 'organisation' && (
        <nav style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
          {[{ key: 'uebersicht' as OrgTab, icon: '📊', label: 'Übersicht' }, { key: 'buchungen' as OrgTab, icon: '📅', label: 'Dienstplan' }, { key: 'jobslots' as OrgTab, icon: '💼', label: 'Job-Slots' }, { key: 'food-donation-slots' as OrgTab, icon: '🍞', label: 'Verpflegung' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveOrgTab(tab.key)}
              style={{ padding: '12px 16px', cursor: 'pointer', background: activeOrgTab === tab.key ? '#198754' : '#e9ecef', color: activeOrgTab === tab.key ? '#fff' : '#000', border: 'none', borderRadius: 8, fontSize: 15, minHeight: 44, minWidth: 120, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </nav>
      )}

      {activeMainTab === 'stammdaten' && (
        <nav style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {[{ key: 'turniere' as StammTab, icon: '🏆', label: 'Turniere' }, { key: 'vereine' as StammTab, icon: '🏅', label: 'Vereine' }, { key: 'work-areas' as StammTab, icon: '📍', label: 'Arbeitsbereiche' }, { key: 'global-time-slots' as StammTab, icon: '🕐', label: 'Zeitslots' }, { key: 'helfer' as StammTab, icon: '👥', label: 'Helfer' }, { key: 'jahrgaenge' as StammTab, icon: '📅', label: 'Jahrgänge' }, { key: 'lebensmittel' as StammTab, icon: '🍞', label: 'Lebensmittel' }].map(tab => (
            <button key={tab.key} onClick={() => setActiveStammTab(tab.key)} style={{ padding: '12px 16px', cursor: 'pointer', background: activeStammTab === tab.key ? '#6c757d' : '#e9ecef', color: activeStammTab === tab.key ? '#fff' : '#000', border: 'none', borderRadius: 8, fontSize: 15, minHeight: 44, minWidth: 120, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* CONTENT AREA */}
      <main>
        {activeMainTab === 'spielplan' && activeSpielplanTab === 'turnier-tage' && <TurnierTage tournamentId={selectedTournamentId} yearGroupId={selectedYearGroupId} yearGroups={(tournaments.find(t => t.id === selectedTournamentId)?.yearGroups as any) || []} />}
        {activeMainTab === 'spielplan' && activeSpielplanTab === 'felder' && <Felder tournamentId={selectedTournamentId} yearGroupId={selectedYearGroupId} />}
        {activeMainTab === 'spielplan' && activeSpielplanTab === 'teilnehmer' && <Teilnehmer tournamentId={selectedTournamentId} yearGroupId={selectedYearGroupId} tournament={(tournaments.find(t => t.id === selectedTournamentId) as any) || null} />}
        {activeMainTab === 'spielplan' && activeSpielplanTab === 'modus' && <TurnierModus tournament={tournaments.find(t => t.id === selectedTournamentId) || null} selectedYearGroupId={selectedYearGroupId} yearGroups={(tournaments.find(t => t.id === selectedTournamentId)?.yearGroups as any) || []} />}
        {activeMainTab === 'spielplan' && activeSpielplanTab === 'spielplan-gruppenphase' && <Spielplan tournamentId={selectedTournamentId} yearGroupId={selectedYearGroupId} phase="gruppenphase" />}
        {activeMainTab === 'spielplan' && activeSpielplanTab === 'spielplan-ko' && <Spielplan tournamentId={selectedTournamentId} yearGroupId={selectedYearGroupId} phase="ko" />}
        
        {activeMainTab === 'organisation' && activeOrgTab === 'uebersicht' && <Uebersicht selectedTournament={selectedTournamentId} />}
        {activeMainTab === 'organisation' && activeOrgTab === 'buchungen' && <Buchungen selectedTournament={selectedTournamentId} adminPrimary="#198754" />}
        {activeMainTab === 'organisation' && activeOrgTab === 'jobslots' && <Jobslots selectedTournament={selectedTournamentId} tournament={tournaments.find(t => t.id === selectedTournamentId) || null} adminPrimary="#198754" />}
        {activeMainTab === 'organisation' && activeOrgTab === 'food-donation-slots' && <FoodDonationSlots selectedTournament={selectedTournamentId} tournament={tournaments.find(t => t.id === selectedTournamentId) || null} adminPrimary="#198754" />}

        {activeMainTab === 'stammdaten' && activeStammTab === 'turniere' && <Turniere adminPrimary="#6c757d" adminSecondary="#adb5bd" />}
        {activeMainTab === 'stammdaten' && activeStammTab === 'vereine' && <Vereine adminPrimary="#6c757d" />}
        {activeMainTab === 'stammdaten' && activeStammTab === 'work-areas' && <WorkAreas adminPrimary="#6c757d" />}
        {activeMainTab === 'stammdaten' && activeStammTab === 'global-time-slots' && <GlobalTimeSlots adminPrimary="#6c757d" />}
        {activeMainTab === 'stammdaten' && activeStammTab === 'helfer' && <Helfer adminPrimary="#6c757d" tournamentId={selectedTournamentId} />}
        {activeMainTab === 'stammdaten' && activeStammTab === 'jahrgaenge' && <Jahrgaenge adminPrimary="#6c757d" />}
        {activeMainTab === 'stammdaten' && activeStammTab === 'lebensmittel' && <Lebensmittel adminPrimary="#6c757d" />}
      </main>
      <ModalRoot />
    </div>
  );
}

// ===================== Root App mit UserProvider =====================
export default function App() {
  const getInitialView = (): View => {
    if (typeof window === 'undefined') return 'selfservice';
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'admin') return 'admin';
    if (viewParam === 'privacy') return 'privacy';
    if (viewParam === 'selfservice') return 'selfservice';
    const host = window.location.hostname.toLowerCase();
    if (host.includes('admin')) return 'admin';
    return 'selfservice';
  };

  // Initial view ohne Context (für SSR)
  const [currentView, setCurrentView] = useState<View>(getInitialView());

  if (currentView === 'privacy') {
    return <Privacy />;
  }

  return (
    <UserProvider>
      {currentView === 'selfservice' ? (
        <SelfServiceView onLoginAsAdmin={() => setCurrentView('admin')} />
      ) : (
        <AdminView />
      )}
    </UserProvider>
  );
}
