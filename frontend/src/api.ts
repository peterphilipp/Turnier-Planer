// Generic fetch wrapper to handle errors and JSON parsing
export const apiFetch = async (url: string, options?: RequestInit) => {
  const res = await fetch(url, options);
  if (!res.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errorData = await res.json();
      errorMsg = errorData.error || errorData.message || errorMsg;
    } catch (e) {
      // Not JSON
    }
    throw new Error(errorMsg);
  }
  // For 204 No Content
  if (res.status === 204) return null;
  return res.json();
};

// ===================== Queries =====================
export const getTournaments = () => apiFetch('/api/tournaments');
export const getArbeitsbereiche = () => apiFetch('/api/arbeitsbereiche');
export const getZeitSlots = () => apiFetch('/api/zeit-slots');
export const getVolunteers = (tournamentId?: number | null) => apiFetch(tournamentId ? `/api/volunteers?tournamentId=${tournamentId}` : '/api/volunteers');
export const getClubs = () => apiFetch('/api/clubs').catch(() => []); // Fallback if clubs endpoint doesn't exist

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

// ===================== Mutations (Generic) =====================
export const apiPost = (url: string, data: any) => 
  apiFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const apiPatch = (url: string, data: any) => 
  apiFetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const apiPut = (url: string, data: any) => 
  apiFetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const apiDelete = (url: string) => 
  apiFetch(url, { method: 'DELETE' });
