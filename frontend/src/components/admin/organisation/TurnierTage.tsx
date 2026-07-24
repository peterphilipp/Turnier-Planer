import { useState, useEffect } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTimeSlots, apiPut } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, TimeSlot, YearGroup, Tournament } from '../shared';

interface Props {
  tournamentId: number | null;
  yearGroupId: number | null;
  yearGroups: YearGroup[];
}

interface DaySlot {
  date: string;
  active: boolean;
  startTime: string;
  endTime: string;
}

export default function TurnierTage({ tournamentId, yearGroupId, yearGroups }: Props) {
  const queryClient = useQueryClient();
  const [daySlots, setDaySlots] = useState<DaySlot[]>([]);

  // Load tournament to get start/end date
  const { data: tournament } = useQuery<Tournament>({
    queryKey: ['tournament', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return null;
      return fetch(`/api/tournaments/${tournamentId}`).then(r => r.json());
    },
    enabled: !!tournamentId
  });

  const { data: rawSlots } = useQuery<TimeSlot[]>({
    queryKey: ['timeSlots', tournamentId],
    queryFn: () => getTimeSlots(tournamentId),
    enabled: !!tournamentId
  });

  useEffect(() => {
    const slots = rawSlots || [];
    if (tournament?.startDate && tournament?.endDate && yearGroupId) {
      const dates: string[] = [];
      let current = new Date(tournament.startDate);
      const end = new Date(tournament.endDate);
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      const filteredSlots = slots.filter(s => (s as any).yearGroupId === yearGroupId);

      const initialDaySlots = dates.map(date => {
        const existing = filteredSlots.find(s => s.date.startsWith(date));
        return {
          date,
          active: !!existing,
          startTime: existing ? existing.startTime : '09:00',
          endTime: existing ? existing.endTime : '14:00'
        };
      });

      setDaySlots(initialDaySlots);
    } else {
      setDaySlots([]);
    }
  }, [tournament, rawSlots, yearGroupId]);

  const updateDaySlot = (index: number, changes: Partial<DaySlot>) => {
    setDaySlots(prev => prev.map((s, i) => i === index ? { ...s, ...changes } : s));
  };

  const handleSaveAll = async () => {
    if (!yearGroupId) return await modal.alert({ title: 'Hinweis', message: 'Bitte wähle oben einen Jahrgang aus!' });
    
    const activeSlots = daySlots.filter(d => d.active);
    
    for (const s of activeSlots) {
      if (!s.startTime || !s.endTime) {
         return await modal.alert({ title: 'Hinweis', message: 'Alle aktivierten Tage benötigen Anstoß und Abpfiff!' });
      }
      if (s.startTime >= s.endTime) {
         return await modal.alert({ title: 'Fehler', message: `Der Abpfiff am ${new Date(s.date).toLocaleDateString('de-DE')} muss nach dem Anstoß liegen!` });
      }
    }

    if (!(await modal.confirm({ 
      title: 'Zeitslots speichern', 
      message: 'Das Speichern der Tage überschreibt die aktuellen Zeiten. Ein möglicherweise bereits erstellter Spielplan für diesen Jahrgang wird dabei zurückgesetzt! Fortfahren?', 
      variant: 'danger' 
    }))) return;

    const payload = {
      tournamentId,
      yearGroupId,
      slots: activeSlots.map(s => ({
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        label: 'Spielphase'
      }))
    };

    try {
      await apiPut('/api/time-slots/bulk', payload);
      queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
    } catch (e: any) {
      await modal.alert({ title: 'Fehler', message: e.message || 'Fehler beim Speichern' });
    }
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>📅 Turnier-Tage für Jahrgang</h3>
      </div>

      {!yearGroupId ? (
         <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
           Bitte wähle oben einen Jahrgang aus.
         </div>
      ) : daySlots.length === 0 ? (
         <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
           Turnier hat kein gültiges Start/Enddatum.
         </div>
      ) : (
         <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 12, border: '1px solid #dee2e6' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left', width: '50px' }}>Spielt?</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Datum</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Erstes Spiel (Anstoß)</th>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Letzter Abpfiff</th>
                </tr>
              </thead>
              <tbody>
                {daySlots.map((slot, i) => {
                  const dateObj = new Date(slot.date);
                  const dayName = dateObj.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
                  
                  return (
                    <tr key={slot.date} style={{ opacity: slot.active ? 1 : 0.6, background: slot.active ? '#fff' : 'transparent' }}>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                         <input 
                           type="checkbox" 
                           checked={slot.active} 
                           onChange={e => updateDaySlot(i, { active: e.target.checked })}
                           style={{ width: 18, height: 18, cursor: 'pointer' }}
                         />
                      </td>
                      <td style={{ ...tdStyle, fontWeight: slot.active ? 'bold' : 'normal' }}>{dayName}</td>
                      <td style={tdStyle}>
                         <input 
                           type="time" 
                           value={slot.startTime} 
                           onChange={e => updateDaySlot(i, { startTime: e.target.value })} 
                           style={{ ...inputStyle, width: 140, background: slot.active ? '#fff' : '#e9ecef' }} 
                           disabled={!slot.active}
                         />
                      </td>
                      <td style={tdStyle}>
                         <input 
                           type="time" 
                           value={slot.endTime} 
                           onChange={e => updateDaySlot(i, { endTime: e.target.value })} 
                           style={{ ...inputStyle, width: 140, background: slot.active ? '#fff' : '#e9ecef' }} 
                           disabled={!slot.active}
                         />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
               <button onClick={handleSaveAll} style={{ ...btnStyle, background: '#28a745', color: '#fff', border: 'none' }}>
                 ✓ Alle Tage speichern
               </button>
            </div>
         </div>
      )}
    </div>
  );
}
