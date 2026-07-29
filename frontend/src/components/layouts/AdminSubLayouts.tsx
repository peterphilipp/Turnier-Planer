import { NavLink, Outlet, useOutletContext, useLocation, Navigate } from 'react-router-dom';
import { Tournament } from '../admin/shared';

interface AdminContext {
  selectedTournamentId: number | null;
  selectedYearGroupId: number | null;
  setSelectedTournamentId: (id: number | null) => void;
  setSelectedYearGroupId: (id: number | null) => void;
  tournaments: Tournament[];
  isAdmin: boolean;
}

function TournamentSelectCard({ context, showYearGroup = false }: { context: AdminContext, showYearGroup?: boolean }) {
  const { selectedTournamentId, selectedYearGroupId, setSelectedTournamentId, setSelectedYearGroupId, tournaments } = context;
  const activeTournament = tournaments.find(t => t.id === selectedTournamentId);
  const sponsorLogo = activeTournament?.logo;

  const formatDate = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e9ecef',
      borderRadius: 12,
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 32,
      marginBottom: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
      marginTop: 12
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontWeight: 'bold', color: '#495057', fontSize: 15 }}>Aktives Turnier:</span>
        <select
          value={selectedTournamentId || ''}
          onChange={(e) => {
            setSelectedTournamentId(Number(e.target.value));
            setSelectedYearGroupId(null);
          }}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #ced4da',
            fontSize: 15,
            minWidth: 260,
            background: '#fff'
          }}
        >
          <option value="" disabled>Turnier wählen...</option>
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({formatDate(t.startDate)})</option>
          ))}
        </select>
      </div>

      {sponsorLogo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#adb5bd', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sponsor:</span>
          <img src={sponsorLogo} alt="Sponsor" style={{ maxHeight: 36, objectFit: 'contain' }} />
        </div>
      )}

      {showYearGroup && selectedTournamentId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <span style={{ fontWeight: 'bold', color: '#495057', fontSize: 15 }}>Jahrgang:</span>
          <select
            value={selectedYearGroupId || ''}
            onChange={(e) => setSelectedYearGroupId(e.target.value ? Number(e.target.value) : null)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid #ced4da',
              fontSize: 15,
              minWidth: 200,
              background: '#fff'
            }}
          >
            <option value="">-- Alle --</option>
            {activeTournament?.yearGroups?.map((yg: any) => (
              <option key={yg.id} value={yg.id}>{yg.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ----------------------
// SPIELPLAN
// ----------------------
export function SpielplanLayout() {
  const context = useOutletContext<AdminContext>();
  const location = useLocation();

  // Redirect to default tab if base route is hit
  if (location.pathname === '/admin/spielplan' || location.pathname === '/admin/spielplan/') {
    return <Navigate to="turnier-tage" replace />;
  }

  const tabs = [
    { to: 'turnier-tage', icon: '🗓️', label: 'Turniertage' },
    { to: 'felder', icon: '🏟️', label: 'Spielfelder' },
    { to: 'teilnehmer', icon: '👥', label: 'Teilnehmer' },
    { to: 'modus', icon: '⚙️', label: 'Turniermodus' },
    { to: 'gruppenphase', icon: '📊', label: 'Gruppenphase' },
    { to: 'ko', icon: '🏆', label: 'K.O.-Runde' }
  ];

  return (
    <>
      <TournamentSelectCard context={context} showYearGroup={true} />
      <nav style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            style={({ isActive }) => ({
              padding: '12px 16px', textDecoration: 'none', cursor: 'pointer',
              background: isActive ? '#0d6efd' : '#e9ecef',
              color: isActive ? '#fff' : '#000',
              border: 'none', borderRadius: 8, fontSize: 15, minHeight: 44, minWidth: 120,
              display: 'flex', alignItems: 'center', gap: 6
            })}
          >
            <span>{tab.icon}</span><span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
      <main>
        <Outlet context={context} />
      </main>
    </>
  );
}

// ----------------------
// ORGANISATION
// ----------------------
export function OrganisationLayout() {
  const context = useOutletContext<AdminContext>();
  const location = useLocation();

  if (location.pathname === '/admin/organisation' || location.pathname === '/admin/organisation/') {
    return <Navigate to="uebersicht" replace />;
  }

  const tabs = [
    { to: 'uebersicht', icon: '📋', label: 'Dienstplan' },
    { to: 'food-donation-slots', icon: '🍰', label: 'Verpflegung' },
    { to: 'shopping-list', icon: '🛒', label: 'Einkaufsliste' },
    { to: 'push-broadcast', icon: '🔔', label: 'Push-Nachrichten' }
  ];

  return (
    <>
      <TournamentSelectCard context={context} showYearGroup={false} />
      <nav style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            style={({ isActive }) => ({
              padding: '12px 16px', textDecoration: 'none', cursor: 'pointer',
              background: isActive ? '#198754' : '#e9ecef',
              color: isActive ? '#fff' : '#000',
              border: 'none', borderRadius: 8, fontSize: 15, minHeight: 44, minWidth: 120,
              display: 'flex', alignItems: 'center', gap: 6
            })}
          >
            <span>{tab.icon}</span><span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
      <main>
        <Outlet context={context} />
      </main>
    </>
  );
}

// ----------------------
// STAMMDATEN
// ----------------------
export function StammdatenLayout() {
  const context = useOutletContext<AdminContext>();
  const { isAdmin } = context;
  const location = useLocation();

  if (location.pathname === '/admin/stammdaten' || location.pathname === '/admin/stammdaten/') {
    return <Navigate to="turniere" replace />;
  }

  const tabs = [
    { to: 'vereine', icon: '🛡️', label: 'Vereine' },
    { to: 'turniere', icon: '🏆', label: 'Turniere' },
    { to: 'jahrgaenge', icon: '👶', label: 'Jahrgänge' },
    { to: 'work-areas', icon: '📍', label: 'Arbeitsbereiche' },
    { to: 'global-time-slots', icon: '📅', label: 'Tagesvorlagen' },
    { to: 'lebensmittel', icon: '🍔', label: 'Verpflegung' },
    { to: 'helfer', icon: '👤', label: 'Benutzer', reqAdmin: true },
    { to: 'db-management', icon: '🗄️', label: 'DB-Management', reqAdmin: true }
  ];

  return (
    <>
      <nav style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.filter(t => !t.reqAdmin || isAdmin).map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            style={({ isActive }) => ({
              padding: '12px 16px', textDecoration: 'none', cursor: 'pointer',
              background: isActive ? '#6c757d' : '#e9ecef',
              color: isActive ? '#fff' : '#000',
              border: 'none', borderRadius: 8, fontSize: 15, minHeight: 44, minWidth: 120,
              display: 'flex', alignItems: 'center', gap: 6
            })}
          >
            <span>{tab.icon}</span><span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
      <main>
        <Outlet context={context} />
      </main>
    </>
  );
}
