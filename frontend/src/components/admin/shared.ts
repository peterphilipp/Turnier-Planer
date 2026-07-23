import { CSSProperties } from 'react';

export const tdStyle: CSSProperties = { padding: '12px 16px', border: '1px solid #e9ecef', verticalAlign: 'top' };
export const thStyle: CSSProperties = { ...tdStyle, background: '#f8f9fa', fontWeight: '600', fontSize: 13, color: '#495057' };
export const btnStyle: CSSProperties = { padding: '6px 12px', cursor: 'pointer', border: '1px solid #dee2e6', borderRadius: 8, background: '#f8f9fa', fontSize: 13 };
export const inputStyle: CSSProperties = { padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff' };

export const shadeColor = (color: string, percent: number) => {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);
  R = Math.max(0, Math.min(255, R + Math.round(R * percent / 100)));
  G = Math.max(0, Math.min(255, G + Math.round(G * percent / 100)));
  B = Math.max(0, Math.min(255, B + Math.round(B * percent / 100)));
  return '#' + (R.toString(16).padStart(2, '0')) + (G.toString(16).padStart(2, '0')) + (B.toString(16).padStart(2, '0'));
};

export const statusBadge = (status: string) => status === 'aktiv' ? '🟢' : status === 'beendet' ? '🟡' : '⚪';

export interface Tournament { id: number; name: string; startDate: string; endDate: string; status: string; turnierModus: string; clubId: number | null; yearGroupIds?: number[]; club: { id: number; name: string; logo: string | null; primaryColor: string; secondaryColor: string; accentColor: string } | null; yearGroups: { id: number; name: string; birthYearStart: number; birthYearEnd: number }[]; }
export interface Shift { id: number; tournamentId: number; date: string; zeitslotId: number | null; slot: string; arbeitsbereichId: number | null; maxVolunteers: number; description: string | null; zeitslot: { id: number; name: string; startTime: string; endTime: string; color: string; order: number } | null; arbeitsbereich: { id: number; name: string; icon: string; color: string } | null; }
export interface Arbeitsbereich { id: number; name: string; icon: string; color: string; minVolunteers: number; maxVolunteers: number; }
export interface Zeitslot { id: number; name: string; startTime: string; endTime: string; color: string; order: number; }
export interface VolunteerShift { id: number; volunteerId: number; tournamentId: number | null; date: string; slot: string; role: string; areaId: number | null; shiftId: number | null; arbeitsbereichId?: number | null; arbeitsbereich: { id: number; name: string; icon: string; color: string } | null; volunteer?: { id: number; name: string; roles: string[]; phone?: string }; }
export interface Volunteer { id: number; name: string; email: string | null; phone: string | null; roles: string[]; tournamentId: number | null; consentGiven?: boolean; consentDate?: string; children?: { childName: string; childYear: number }[]; }
export interface Club { id: number; name: string; city: string | null; logo: string | null; primaryColor: string; secondaryColor: string; accentColor: string; }
export interface FoodCategory { id: number; name: string; icon: string; order: number; items: FoodItem[]; }
export interface FoodItem { id: number; categoryId: number; name: string; price: string | null; unit: string; category?: { id: number; name: string; icon: string }; }
export interface YearGroup { id: number; name: string; birthYearStart: number; birthYearEnd: number; order: number; isActive: boolean; }
export interface FoodDonationSlot { id: number; tournamentId: number; yearGroupId: number | null; yearGroup?: YearGroup | null; foodItemId: number | null; targetQuantity: number; collected: number; description: string | null; volunteerId: number | null; tournament?: { id: number; name: string }; foodItem?: { id: number; categoryId: number; name: string; icon: string; unit: string; category?: { id: number; name: string; icon: string } }; volunteer?: { id: number; name: string; email: string }; }
export interface TimeSlot { id: number; tournamentId: number; date: string; startTime: string; endTime: string; label: string | null; order: number; matches: Match[]; }
export interface Field { id: number; tournamentId: number; name: string; status: string; matches: Match[]; }
export interface StandingsEntry { id: number; teamId: number; tournamentId: number; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number; position: number; team?: Team | null; }
export interface Match { id: number; tournamentId: number; timeSlotId: number | null; fieldId: number | null; teamAId: number; teamBId: number; scoreA: number | null; scoreB: number | null; phase: string; status: string; time: string; teamA?: Team | null; teamB?: Team | null; timeSlot?: TimeSlot | null; field?: Field | null; }
export interface Group { id: number; name: string; tournamentId: number; teams?: Team[]; }
export interface Team { id: number; name: string; groupId: number | null; tournamentId: number | null; clubId: number | null; club?: Club | null; goalsFor: number; goalsAgainst: number; group?: Group | null; }
export interface KnockoutBracket { id: number; tournamentId: number; name: string; runde: string; order: number; matches: Match[]; }
