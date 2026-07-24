// ===================== Auth Store (für API Calls ohne Hooks) =====================
let currentToken: string = '';

export function setAuthToken(token: string): void {
  currentToken = token;
}

export function getAuthToken(): string {
  return currentToken || localStorage.getItem('token') || '';
}

// ===================== Error Types =====================
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Generic fetch wrapper to handle errors and JSON parsing
export const apiFetch = async (url: string, options?: RequestInit): Promise<any> => {
  // Automatisch Token hinzufügen wenn noch nicht in Options
  const authHeader = options?.headers && 
    (options.headers as Record<string, string>)['Authorization'];
  
  if (!authHeader) {
    const token = getAuthToken();
    if (token) {
      options = {
        ...options,
        headers: {
          ...(options?.headers as Record<string, string> || {}),
          'Authorization': `Bearer ${token}`
        }
      };
    }
  }

  const res = await fetch(url, options);
  
  if (!res.ok) {
    // Spezielle Behandlung für 403 Forbidden
    if (res.status === 403) {
      throw new ApiError('Zugriff verweigert – du hast keine Berechtigung dafür', 403);
    }
    
    // Spezielle Behandlung für 401 Unauthorized
    if (res.status === 401) {
      throw new ApiError('Session abgelaufen – bitte neu anmelden', 401);
    }

    let errorMsg = 'Ein Fehler ist aufgetreten';
    try {
      const text = await res.text();
      try {
        const errorData = JSON.parse(text);
        errorMsg = errorData.error || errorData.message || errorMsg;
        if (errorData.details) {
          errorMsg += ' - ' + JSON.stringify(errorData.details);
        }
      } catch (e) {
        // Fallback to text if not JSON
        if (text) {
          errorMsg = `Server Response: ${text.substring(0, 100)}`;
        }
      }
    } catch (e) {
      // Ignore text read error
    }
    throw new ApiError(errorMsg, res.status);
  }
  
  // Für 204 No Content
  if (res.status === 204) return null;
  return res.json();
};

// ===================== Queries =====================
export const getTournaments = () => apiFetch('/api/tournaments');
export const getWorkAreas = () => apiFetch('/api/work-areas');
export const getGlobalTimeSlots = () => apiFetch('/api/global-time-slots');
export const getVolunteers = (tournamentId?: number | null) => 
  apiFetch(tournamentId ? `/api/volunteers?tournamentId=${tournamentId}` : '/api/volunteers');
export const getClubs = () => apiFetch('/api/clubs').catch(() => []); // Fallback if clubs endpoint doesn't exist
export const getTournamentClubs = (tournamentId: number | null) =>
  tournamentId ? apiFetch(`/api/tournament-clubs?tournamentId=${tournamentId}`) : Promise.resolve([]);
export const addTournamentClub = (tournamentId: number, clubId: number) =>
  apiPost('/api/tournament-clubs', { tournamentId, clubId });
export const removeTournamentClub = (tournamentId: number, clubId: number) =>
  apiDelete(`/api/tournament-clubs?tournamentId=${tournamentId}&clubId=${clubId}`);

export const getShifts = (tournamentId?: string | number | null) => 
  tournamentId ? apiFetch(`/api/shifts?tournamentId=${tournamentId}`) : Promise.resolve([]);

export const getVolunteerShifts = (tournamentId?: string | number | null) => 
  tournamentId ? apiFetch(`/api/volunteer-shifts?tournamentId=${tournamentId}`) : Promise.resolve([]);

// ===================== Food =====================
export const getFoodCategories = () => apiFetch('/api/food/categories');
export const getFoodItems = () => apiFetch('/api/food/items');
export const getFoodDonations = () => apiFetch('/api/food/donations');
export const getFoodDonationSlots = (tournamentId?: number | null) => 
  apiFetch(`/api/food-donation-slots?tournamentId=${tournamentId}`);

// ===================== Year Groups =====================
export const getYearGroups = () => apiFetch('/api/year-groups');

// ===================== Tournament (Phase 1) =====================
export const getTimeSlots = (tournamentId: number | null) => 
  tournamentId ? apiFetch(`/api/time-slots?tournamentId=${tournamentId}`) : Promise.resolve([]);
export const getFields = (tournamentId: number | null) => 
  tournamentId ? apiFetch(`/api/fields?tournamentId=${tournamentId}`) : Promise.resolve([]);
export const getStandings = (tournamentId: number | null) => 
  tournamentId ? apiFetch(`/api/standings/${tournamentId}`) : Promise.resolve([]);
export const recalculateStandings = (tournamentId: number) => 
  apiFetch(`/api/standings/${tournamentId}/recalculate`, { method: 'POST' });
export const getGroups = (tournamentId: number | null) => 
  tournamentId ? apiFetch(`/api/groups/${tournamentId}`) : Promise.resolve([]);
export const getTeamsByGroup = (groupId: number | null) => 
  groupId ? apiFetch(`/api/teams?groupId=${groupId}`) : Promise.resolve([]);
export const getTeamsByTournament = (tournamentId: number | null) =>
  tournamentId ? apiFetch(`/api/teams?tournamentId=${tournamentId}`) : Promise.resolve([]);

// ===================== Match Generation (Phase 1) =====================
export const generateMatchesForYearGroup = (tournamentId: number, yearGroupId: number) => 
  apiPost(`/api/tournaments/${tournamentId}/generate-matches`, { yearGroupId });

// ===================== Knockout Brackets =====================
export const getBrackets = (tournamentId: number | null) => 
  tournamentId ? apiFetch(`/api/knockout-brackets?tournamentId=${tournamentId}`) : Promise.resolve([]);

// ===================== Mutations (Generic) =====================
export const apiPost = (url: string, data: any) => 
  apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const apiPatch = (url: string, data: any) => 
  apiFetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const apiPut = (url: string, data: any) => 
  apiFetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const apiDelete = (url: string) => 
  apiFetch(url, { method: 'DELETE' });

export const getDeleteImpact = (type: string, id: number) => 
  apiFetch(`/api/impact/${type}/${id}`);
