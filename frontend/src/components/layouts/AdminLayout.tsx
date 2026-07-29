import { useEffect, useState } from 'react';
import { NavLink, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useQuery } from '@tanstack/react-query';
import { getTournaments, setAuthToken, ApiError } from '../../api';
import { Tournament } from '../admin/shared';

type MainTab = 'spielplan' | 'organisation' | 'stammdaten';

export default function AdminLayout() {
  const { isAdmin, isOrganizer, token, isLoggedIn: ctxLoggedIn, logout } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

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
        <div className="admin-core-style-42" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.webp" alt="Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
          <h1 className="admin-core-style-43" onClick={() => navigate('/admin')} style={{ margin: 0, fontSize: 28, fontWeight: 'bold', color: '#212529', cursor: 'pointer' }}>
            Turnierplaner – Admin
          </h1>
        </div>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ background: '#dc3545', color: '#fff', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>👑 Admin</span>
          <button
            onClick={() => navigate('/')}
            className="admin-core-style-46"
            style={{ background: '#0d6efd', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 14 }}
          >
            Self-Service-Bereich
          </button>
        </div>
      </header>

      {/* MAIN NAVIGATION */}
      <nav className="admin-core-style-47">
        {[
          { key: 'spielplan', icon: '⚽', label: 'Spielplan' },
          { key: 'organisation', icon: ' clipboard', label: 'Organisation', iconObj: '📋' },
          { key: 'stammdaten', icon: 'database', label: 'Stammdaten', iconObj: '⚙️' }
        ].map(tab => (
          <NavLink
            key={tab.key}
            to={`/admin/${tab.key}`}
            className={({ isActive }) => (isActive || (activeMainTab === tab.key)) ? 'active' : ''}
            style={({ isActive }) => ({
              padding: '12px 24px',
              textDecoration: 'none',
              cursor: 'pointer',
              background: (isActive || activeMainTab === tab.key) ? (tab.key === 'spielplan' ? '#0d6efd' : tab.key === 'organisation' ? '#198754' : '#6c757d') : 'transparent',
              color: (isActive || activeMainTab === tab.key) ? '#fff' : '#6c757d',
              border: (isActive || activeMainTab === tab.key) ? 'none' : '2px solid #e9ecef',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s'
            })}
          >
            <span>{tab.iconObj || tab.icon}</span> <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* SUB-NAVIGATION & CONTENT (via Outlet) */}
      <Outlet context={{
        selectedTournamentId,
        selectedYearGroupId,
        setSelectedTournamentId,
        setSelectedYearGroupId,
        tournaments,
        isAdmin
      }} />

      {/* FOOTER */}
      <footer className="admin-core-style-48">
        <p className="admin-core-style-49">© {new Date().getFullYear()} Peter Philipp</p>
      </footer>
    </div>
  );
}
