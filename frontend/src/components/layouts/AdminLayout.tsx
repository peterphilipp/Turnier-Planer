import { useEffect, useState } from 'react';
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useQuery } from '@tanstack/react-query';
import { getTournaments, setAuthToken, ApiError } from '../../api';
import { Tournament } from '../admin/shared';
import { useIsMobile } from '../../hooks/useIsMobile';

const MAIN_TABS = [
  { key: 'spielplan', icon: '⚽', label: 'Spielplan', color: '#0d6efd' },
  { key: 'organisation', icon: '📋', label: 'Organisation', color: '#198754' },
  { key: 'stammdaten', icon: '⚙️', label: 'Stammdaten', color: '#6c757d' }
] as const;

export default function AdminLayout() {
  const { isAdmin, isOrganizer, token, isLoggedIn: ctxLoggedIn, logout, isInitializing } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Role check
  let adminAccess = isAdmin || isOrganizer;
  if (!adminAccess) {
    try {
      const vol = JSON.parse(localStorage.getItem('volunteer') || '{}');
      adminAccess = vol.role === 'ADMIN' || vol.role === 'ORGANIZER';
    } catch {}
  }

  // Token sync
  useEffect(() => {
    if (token) setAuthToken(token);
  }, [token]);

  // Fetch Tournaments and state
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [selectedYearGroupId, setSelectedYearGroupId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: tournaments = [], error: queryError } = useQuery<Tournament[]>({ 
    queryKey: ['tournaments'], 
    queryFn: getTournaments,
    retry: (failureCount, error) => {
      const err = error as unknown as ApiError;
      if (err && err.status === 401) return false;
      return failureCount < 2;
    }
  });

  useEffect(() => {
    const err = queryError as unknown as ApiError;
    if (err) {
      if (err.status === 401 && err.message?.includes('Session abgelaufen')) {
        logout();
        navigate('/login');
      } else if (err.message) {
        setError(err.message);
      }
    }
  }, [queryError, logout, navigate]);

  useEffect(() => {
    const active = tournaments.find(t => t.status === 'aktiv');
    if (active && !selectedTournamentId) {
      setSelectedTournamentId(active.id);
    }
  }, [tournaments, selectedTournamentId]);

  // Warten bis Initialisierung abgeschlossen ist (verhindert fälschliche Redirects bei F5 Reloads)
  if (isInitializing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f8f9fa', fontSize: 18, color: '#666' }}>
        🔄 Lade Admin-Bereich...
      </div>
    );
  }

  // Auth redirect
  if (!ctxLoggedIn && !token) {
    return <Navigate to="/login" replace />;
  }

  if (!adminAccess) {
    return (
      <div className="admin-core-style-30">
        <div className="admin-core-style-31">🔒</div>
        <h2 className="admin-core-style-32">Zugriff verweigert</h2>
        <p className="admin-core-style-33">
          Du hast keine Berechtigung für den Admin-Bereich.
        </p>
        <button
          onClick={() => navigate('/')}
          className="admin-core-style-34"
        >
          Zurück
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-core-style-35">
        <div className="admin-core-style-36">⚠️</div>
        <h2 className="admin-core-style-37">Fehler</h2>
        <p className="admin-core-style-38">{error}</p>
        <button
          onClick={() => { setError(null); window.location.reload(); }}
          className="admin-core-style-39"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  // Extract active main tab from URL (/admin/spielplan/... -> spielplan)
  const pathParts = location.pathname.split('/').filter(Boolean);
  const activeMainTab = pathParts[1] || 'spielplan';

  return (
    <div className="admin-core-style-40">
      <header className="admin-core-style-41">
        <div className="admin-core-style-42" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <img src="/logo.webp" alt="Logo" style={{ width: isMobile ? 32 : 40, height: isMobile ? 32 : 40, objectFit: 'contain', flexShrink: 0 }} />
          <h1
            className="admin-core-style-43"
            onClick={() => navigate('/admin')}
            style={{ margin: 0, fontSize: isMobile ? 18 : 28, fontWeight: 'bold', color: '#212529', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            {/* Auf dem Handy reicht "Admin": der lange Titel verdraengt sonst
                die eigentliche Arbeitsflaeche, und wo man ist, sagt ohnehin
                die untere Tab-Leiste. */}
            {isMobile ? 'Admin' : 'Turnierplaner – Admin'}
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {!isMobile && (
            <span style={{ background: '#dc3545', color: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>👑 Admin</span>
          )}
          <button
            onClick={() => navigate('/')}
            className="admin-core-style-46"
            title="Zum Self-Service-Bereich"
            aria-label="Zum Self-Service-Bereich"
            style={{ background: '#0d6efd', color: '#fff', border: 'none', padding: isMobile ? '8px 12px' : '10px 16px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 14, minHeight: 40, whiteSpace: 'nowrap' }}
          >
            {isMobile ? '👤' : 'Self-Service-Bereich'}
          </button>
        </div>
      </header>

      {/* HAUPTNAVIGATION - auf dem Desktop oben, mobil als untere Tab-Leiste */}
      {!isMobile && (
        <nav className="admin-core-style-47">
          {MAIN_TABS.map(tab => {
            const active = activeMainTab === tab.key;
            return (
              <NavLink
                key={tab.key}
                to={`/admin/${tab.key}`}
                className={active ? 'active' : ''}
                style={{
                  padding: '12px 24px',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  background: active ? tab.color : 'transparent',
                  color: active ? '#fff' : '#6c757d',
                  border: active ? 'none' : '2px solid #e9ecef',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s'
                }}
              >
                <span>{tab.icon}</span> <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}

      {/* SUB-NAVIGATION & CONTENT (via Outlet) */}
      <Outlet context={{
        selectedTournamentId,
        selectedYearGroupId,
        setSelectedTournamentId,
        setSelectedYearGroupId,
        tournaments,
        isAdmin
      }} />

      {/* FOOTER - mobil ausgeblendet, die Zeile stuende sonst direkt ueber
          der Tab-Leiste und kostet Platz ohne Nutzen. */}
      {!isMobile && (
        <footer className="admin-core-style-48">
          <p className="admin-core-style-49">© {new Date().getFullYear()} Peter Philipp</p>
        </footer>
      )}

      {isMobile && (
        <nav className="admin-bottom-nav" aria-label="Hauptbereiche">
          {MAIN_TABS.map(tab => {
            const active = activeMainTab === tab.key;
            return (
              <NavLink
                key={tab.key}
                to={`/admin/${tab.key}`}
                className={`admin-bottom-nav-item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                style={active ? ({
                  ['--admin-bottom-nav-active' as any]: tab.color,
                  ['--admin-bottom-nav-active-bg' as any]: `${tab.color}12`
                } as React.CSSProperties) : undefined}
              >
                <span className="admin-bottom-nav-icon" aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
}
