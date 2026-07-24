import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// ===================== Rollen-System (Enum) =====================
export type Role = 'HELPER' | 'ORGANIZER' | 'ADMIN';

/** Prüft ob eine Rolle Admin-Rechte hat */
function hasAdminAccess(role: Role): boolean {
  return role === 'ADMIN' || role === 'ORGANIZER';
}

interface VolunteerData {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role?: Role;
  tournamentId?: number | null;
  consentGiven?: boolean;
  consentDate?: string;
  children?: { childName: string | null; childYear: number | null }[];
}

interface UserContextType {
  volunteer: VolunteerData | null;
  token: string;
  isLoggedIn: boolean;
  role: Role;
  isAdmin: boolean;
  isOrganizer: boolean;
  hasAdminAccess: boolean;
  login: (token: string, volunteer: VolunteerData) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export function useUser(): UserContextType {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser muss innerhalb eines UserContext.Provider verwendet werden');
  return ctx;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [volunteer, setVolunteer] = useState<VolunteerData | null>(null);
  const [token, setToken] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Initialisierung aus localStorage (nur beim Mounten)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('token');
      const savedVolunteer = localStorage.getItem('volunteer');
      if (savedToken && savedVolunteer) {
        try {
          setToken(savedToken);
          setVolunteer(JSON.parse(savedVolunteer));
          setIsLoggedIn(true);
        } catch {
          // Alte/gewandelte Daten ungültig – Cache leeren
          localStorage.removeItem('token');
          localStorage.removeItem('volunteer');
        }
      }
    }
  }, []);

  const login = useCallback((newToken: string, newVolunteer: VolunteerData) => {
    setToken(newToken);
    setVolunteer(newVolunteer);
    setIsLoggedIn(true);
    localStorage.setItem('token', newToken);
    localStorage.setItem('volunteer', JSON.stringify(newVolunteer));
  }, []);

  const logout = useCallback(() => {
    setVolunteer(null);
    setToken('');
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    localStorage.removeItem('volunteer');
  }, []);

  // Rolle aus dem Volunteer-Objekt extrahieren (Fallback: HELPER)
  const role: Role = volunteer?.role ? (volunteer.role as Role) : 'HELPER';
  const isAdmin = role === 'ADMIN';
  const isOrganizer = role === 'ORGANIZER';
  const hasAdminAccessRole = hasAdminAccess(role);

  return (
    <UserContext.Provider value={{ volunteer, token, isLoggedIn, role, isAdmin, isOrganizer, hasAdminAccess: hasAdminAccessRole, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}
