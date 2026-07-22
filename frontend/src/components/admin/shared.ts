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

export interface Tournament { id: number; name: string; startDate: string; endDate: string; status: string; clubId: number | null; club: { id: number; name: string; logo: string | null; primaryColor: string; secondaryColor: string; accentColor: string } | null; }
export interface Shift { id: number; tournamentId: number; date: string; zeitslotId: number | null; slot: string; arbeitsbereichId: number | null; maxVolunteers: number; description: string | null; zeitslot: { id: number; name: string; startTime: string; endTime: string; color: string; order: number } | null; arbeitsbereich: { id: number; name: string; icon: string; color: string } | null; }
export interface Arbeitsbereich { id: number; name: string; icon: string; color: string; minVolunteers: number; maxVolunteers: number; }
export interface Zeitslot { id: number; name: string; startTime: string; endTime: string; color: string; order: number; }
export interface VolunteerShift { id: number; volunteerId: number; tournamentId: number | null; date: string; slot: string; role: string; areaId: number | null; shiftId: number | null; arbeitsbereichId?: number | null; arbeitsbereich: { id: number; name: string; icon: string; color: string } | null; volunteer?: { id: number; name: string; roles: string[] }; }
export interface Volunteer { id: number; name: string; email: string | null; phone: string | null; roles: string[]; tournamentId: number | null; }
export interface Club { id: number; name: string; logo: string | null; primaryColor: string; secondaryColor: string; accentColor: string; }
export interface FoodCategory { id: number; name: string; icon: string; order: number; items: FoodItem[]; }
export interface FoodItem { id: number; categoryId: number; name: string; price: string | null; unit: string; category?: { id: number; name: string; icon: string }; }
export interface YearGroup { id: number; name: string; birthYearStart: number; birthYearEnd: number; order: number; isActive: boolean; }
export interface FoodDonationSlot { id: number; tournamentId: number; yearGroupId: number | null; yearGroup?: YearGroup | null; foodItemId: number | null; targetQuantity: number; collected: number; description: string | null; volunteerId: number | null; tournament?: { id: number; name: string }; foodItem?: { id: number; categoryId: number; name: string; icon: string; unit: string }; volunteer?: { id: number; name: string; email: string }; }
