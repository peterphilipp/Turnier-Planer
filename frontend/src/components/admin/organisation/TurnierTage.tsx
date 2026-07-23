import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTimeSlots, apiPost, apiPatch, apiDelete } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, TimeSlot } from '../shared';

interface Props {
  tournamentId: number | null;
}

export default function TurnierTage({ tournamentId }: Props) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '', startTime: '09:00', durationMinutes: 90, label: 'Spielphase' });

  const { data: slots = [] } = useQuery<TimeSlot[]>({
    queryKey: ['timeSlots', tournamentId],
    queryFn: () => getTimeSlots(tournamentId),
    enabled: !!tournamentId
  });

  // Gruppieren nach Datum
  const groupedByDate = slots.reduce<Record<string, TimeSlot[]>>((acc, slot) => {
    const dateKey = slot.date.split('T')[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(slot);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort();

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    if (!startTime) return '--:--';
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!tournamentId || !form.date) return await modal.alert({ title: 'Hinweis', message: 'Datum erforderlich!' });
    if (!form.startTime) return await modal.alert({ title: 'Hinweis', message: 'Anstoßzeit erforderlich!' });
    
    const endTime = calculateEndTime(form.startTime, form.durationMinutes);
    await apiPost('/api/time-slots', { ...form, endTime, tournamentId });
    queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
    setShowForm(false);
    setForm({ date: '', startTime: '09:00', durationMinutes: 90, label: 'Spielphase' });
  };

  const handleDelete = async (id: number) => {
    if (!(await modal.confirm({ title: 'Zeitslot löschen', message: 'Zeitslot löschen? Alle zugewiesenen Spiele gehen verloren.', variant: 'danger' }))) return;
    await apiDelete(`/api/time-slots/${id}`);
    queryClient.invalidateQueries({ queryKey: ['timeSlots'] });
  };

  const labelColors: Record<string, string> = {
    'Spielphase': '#e7f3ff',
    'Pause': '#fff3cd',
    'Finale': '#d1ecf1',
    'Gruppenphase': '#d4edda'
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>📅 Turnier-Tage (Zeitraster)</h3>
        <button onClick={() => setShowForm(!showForm)} style={{ ...btnStyle, background: '#0d6efd', color: '#fff', border: 'none', fontWeight: '600' }}>
          {showForm ? '✕ Abbrechen' : '+ Neuer Zeitslot'}
        </button>
      </div>

      {/* Formular */}
      {showForm && (
        <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 12, marginBottom: 20, border: '1px solid #dee2e6' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#495057' }}>Neuer Zeitslot</h4>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Datum</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ ...inputStyle, width: 160 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>⏰ Anstoß</label>
              <input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} style={{ ...inputStyle, width: 140 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>⏱️ Dauer (Min.)</label>
              <input type="number" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 0 })} style={{ ...inputStyle, width: 100 }} min="30" max="240" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📍 Bis (automatisch)</label>
              <input type="text" value={calculateEndTime(form.startTime, form.durationMinutes)} readOnly style={{ ...inputStyle, width: 140, background: '#f8f9fa', color: '#28a745', fontWeight: '600' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Typ</label>
              <select value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} style={{ ...inputStyle, width: 140 }}>
                <option value="Spielphase">Spielphase</option>
                <option value="Pause">Pause</option>
                <option value="Finale">Finale</option>
                <option value="Gruppenphase">Gruppenphase</option>
              </select>
            </div>
            <button onClick={handleSave} style={{ ...btnStyle, background: '#28a745', color: '#fff', border: 'none', fontWeight: '600' }}>✓ Speichern</button>
          </div>
        </div>
      )}

      {/* Zeitraster nach Tagen gruppiert */}
      {sortedDates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
          Keine Zeitslots angelegt. Klicke "+ Neuer Zeitslot" um den Spielplan zu erstellen.
        </div>
      ) : (
        sortedDates.map(date => {
          const dateObj = new Date(date);
          const dayName = dateObj.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          
          return (
            <div key={date} style={{ marginBottom: 32 }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#212529', borderBottom: '2px solid #dee2e6', paddingBottom: 8 }}>
                {dayName}
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {groupedByDate[date].sort((a, b) => a.order - b.order).map(slot => (
                  <div key={slot.id} style={{ background: '#f8f9fa', padding: 16, borderRadius: 12, border: '1px solid #dee2e6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ 
                          background: labelColors[slot.label || 'Spielphase'] || '#e7f3ff', 
                          padding: '4px 12px', 
                          borderRadius: 6, 
                          fontSize: 13, 
                          fontWeight: '600',
                          color: '#495057'
                        }}>
                          {slot.label || 'Spielphase'}
                        </span>
                        <span style={{ fontSize: 14, color: '#212529', fontWeight: '600' }}>
                          {slot.startTime} – {slot.endTime}
                        </span>
                      </div>
                      <button onClick={() => handleDelete(slot.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none', fontSize: 12 }}>🗑️</button>
                    </div>
                    
                    {/* Spiele in diesem Slot */}
                    {slot.matches && slot.matches.length > 0 ? (
                      <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={thStyle}>Zeit</th>
                            <th style={thStyle}>Feld</th>
                            <th style={thStyle}>Heim</th>
                            <th style={thStyle}>Gast</th>
                            <th style={thStyle}>Ergebnis</th>
                          </tr>
                        </thead>
                        <tbody>
                          {slot.matches.map(match => (
                            <tr key={match.id} style={{ background: match.status === 'gespielt' ? '#d4edda' : match.status === 'abgesagt' ? '#f8d7da' : '#fff' }}>
                              <td style={tdStyle}>{new Date(match.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</td>
                              <td style={tdStyle}>{match.field?.name || '-'}</td>
                              <td style={tdStyle}>{match.teamA?.name || '?'}</td>
                              <td style={tdStyle}>{match.teamB?.name || '?'}</td>
                              <td style={{ ...tdStyle, fontWeight: '600' }}>
                                {match.status === 'gespielt' ? `${match.scoreA ?? '-'} : ${match.scoreB ?? '-'}` : match.status}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ fontSize: 13, color: '#999', fontStyle: 'italic' }}>Keine Spiele zugewiesen</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
