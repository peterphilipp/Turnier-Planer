import { useState, useMemo, useEffect } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getShifts, getWorkAreas, getGlobalTimeSlots, getVolunteerShifts, getTournaments, apiPost, apiPatch, apiDelete } from '../../../api';
import { btnStyleSecondary, btnStyle, inputStyle, Shift, WorkArea, GlobalTimeSlot, Tournament, VolunteerShift } from '../shared';

export default function Jobslots({ selectedTournament, tournament, adminPrimary }: { selectedTournament: number | null, tournament: Tournament | null, adminPrimary: string }) {
  const queryClient = useQueryClient();

  const { data: jobSlots = [], isFetching } = useQuery<Shift[]>({
    queryKey: ['shifts', selectedTournament],
    queryFn: () => getShifts(selectedTournament),
    enabled: !!selectedTournament
  });
  
  const { data: volunteerShifts = [] } = useQuery<VolunteerShift[]>({
    queryKey: ['volunteerShifts', selectedTournament],
    queryFn: () => getVolunteerShifts(selectedTournament),
    enabled: !!selectedTournament
  });

  const { data: tournaments = [] } = useQuery<Tournament[]>({ queryKey: ['tournaments'], queryFn: getTournaments });
  const { data: workAreas = [] } = useQuery<WorkArea[]>({ queryKey: ['workAreas'], queryFn: getWorkAreas });
  const { data: globalTimeSlots = [] } = useQuery<GlobalTimeSlot[]>({ queryKey: ['globalTimeSlots'], queryFn: getGlobalTimeSlots });
  
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [slotForm, setSlotForm] = useState({ dates: [] as string[], zeitslotId: 0 as number, arbeitsbereichIds: [] as number[], description: '' });
  
  const [activeDate, setActiveDate] = useState<string>('');

  // Turnier-Tage generieren
  const tournamentDays = useMemo(() => {
    if (!tournament?.startDate || !tournament?.endDate) return [];
    const days: string[] = [];
    const start = new Date(tournament.startDate);
    const end = new Date(tournament.endDate);
    const current = new Date(start);
    while (current <= end) {
      days.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [tournament]);

  useEffect(() => {
    if (tournamentDays.length > 0 && !activeDate) {
      setActiveDate(tournamentDays[0]);
    }
  }, [tournamentDays, activeDate]);

  const saveSlot = async () => {
    if (!selectedTournament || slotForm.dates.length === 0 || !slotForm.zeitslotId || slotForm.arbeitsbereichIds.length === 0) {
      return await modal.alert({ title: 'Hinweis', message: 'Bitte Datum, Zeitslot und mindestens einen Bereich wählen.' });
    }
    
    const zs = globalTimeSlots.find(z => z.id === slotForm.zeitslotId);
    if (!zs) return;
    const slotName = `${zs.name} (${zs.startTime} - ${zs.endTime})`;

    if (editingSlotId) {
      const date = slotForm.dates[0];
      await apiPatch(`/api/shifts/${editingSlotId}`, { 
        date, 
        zeitslotId: slotForm.zeitslotId, 
        arbeitsbereichId: slotForm.arbeitsbereichIds[0],
        maxVolunteers: workAreas.find(a => a.id === slotForm.arbeitsbereichIds[0])?.maxVolunteers || 8, 
        description: slotForm.description || null, 
        slot: slotName 
      });
    } else {
      for (const date of slotForm.dates) {
        for (const abId of slotForm.arbeitsbereichIds) {
          const maxVol = workAreas.find(a => a.id === abId)?.maxVolunteers || 8;
          await apiPost('/api/shifts', { 
            tournamentId: selectedTournament, 
            date, 
            zeitslotId: slotForm.zeitslotId, 
            arbeitsbereichId: abId, 
            maxVolunteers: maxVol, 
            description: slotForm.description || null, 
            slot: slotName 
          });
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ['shifts', selectedTournament] });
    setSlotForm({ dates: [], zeitslotId: 0, arbeitsbereichIds: [], description: '' });
    setEditingSlotId(null);
  };

  const deleteSlot = async (id: number) => {
    if (!(await modal.confirm({ title: 'Job-Slot löschen', message: 'Möchtest du diesen Job-Slot wirklich löschen?', variant: 'danger' }))) return;
    await apiDelete(`/api/shifts/${id}`);
    queryClient.invalidateQueries({ queryKey: ['shifts', selectedTournament] });
  };

  const copyFromTournament = async () => {
    const options = tournaments.filter(t => t.id !== selectedTournament).map(t => ({ value: String(t.id), label: `${t.name} (${new Date(t.startDate).toLocaleDateString('de-DE')})` }));
    if (options.length === 0) return modal.alert({ title: 'Hinweis', message: 'Keine anderen Turniere vorhanden.' });
    
    const res = await modal.form({
      title: 'Job-Slots kopieren (Tage werden aut. angepasst)',
      fields: [
        { key: 'sourceId', label: 'Quell-Turnier', type: 'select', options }
      ]
    });
    
    if (res && res.sourceId) {
      await apiPost('/api/shifts/copy', { sourceTournamentId: parseInt(res.sourceId as string), targetTournamentId: selectedTournament });
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedTournament] });
      modal.alert({ title: 'Erfolg', message: 'Job-Slots wurden erfolgreich kopiert!' });
    }
  };

  if (!selectedTournament) {
    return <div style={{ padding: 24, background: '#fff', borderRadius: 16 }}>Bitte wähle zunächst oben ein Turnier aus.</div>;
  }

  const toggleDate = (d: string) => {
    if (editingSlotId) { setSlotForm({ ...slotForm, dates: [d] }); return; }
    setSlotForm(prev => ({ ...prev, dates: prev.dates.includes(d) ? prev.dates.filter(x => x !== d) : [...prev.dates, d] }));
  };

  const toggleAb = (id: number) => {
    if (editingSlotId) { setSlotForm({ ...slotForm, arbeitsbereichIds: [id] }); return; }
    setSlotForm(prev => ({ ...prev, arbeitsbereichIds: prev.arbeitsbereichIds.includes(id) ? prev.arbeitsbereichIds.filter(x => x !== id) : [...prev.arbeitsbereichIds, id] }));
  };

  // Matrix Filterung für aktives Datum
  const slotsOnActiveDate = jobSlots.filter(s => s.date.startsWith(activeDate));

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>📋 Job-Slots erstellen (Bedarf & Muster)</h3>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>Lege hier fest, an welchen Tagen und Zeitslots Helfer benötigt werden.</p>
        </div>
        <button onClick={copyFromTournament} style={{ ...btnStyleSecondary, background: '#e8f4fd', color: '#0d6efd', border: '1px solid #b6d4fe' }}>
          📑 Von anderem Turnier kopieren
        </button>
      </div>

      {/* Formular für Job-Slots */}
      <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 12, marginBottom: 30, display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid #dee2e6' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>1. Datum wählen {editingSlotId ? '(Nur eins möglich)' : '(Mehrfachauswahl)'}</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tournamentDays.map(d => (
              <button key={d} onClick={() => toggleDate(d)} style={{ padding: '6px 12px', background: slotForm.dates.includes(d) ? adminPrimary : '#fff', color: slotForm.dates.includes(d) ? '#fff' : '#000', border: slotForm.dates.includes(d) ? 'none' : '1px solid #dee2e6', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: slotForm.dates.includes(d) ? 'bold' : 'normal' }}>
                {new Date(d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>2. Zeitslot</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {globalTimeSlots.map(zs => (
              <button key={zs.id} onClick={() => setSlotForm({ ...slotForm, zeitslotId: zs.id })} style={{ ...btnStyle, background: slotForm.zeitslotId === zs.id ? adminPrimary : '#fff', color: slotForm.zeitslotId === zs.id ? '#fff' : '#000', border: slotForm.zeitslotId === zs.id ? 'none' : '1px solid #dee2e6' }}>
                <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: zs.color, marginRight: 6 }}></span>
                {zs.name} ({zs.startTime}-{zs.endTime})
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>3. Arbeitsbereiche {editingSlotId ? '(Nur einer)' : '(Mehrfachauswahl)'}</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {workAreas.map(wa => (
              <button key={wa.id} onClick={() => toggleAb(wa.id)} style={{ ...btnStyle, background: slotForm.arbeitsbereichIds.includes(wa.id) ? adminPrimary : '#fff', color: slotForm.arbeitsbereichIds.includes(wa.id) ? '#fff' : '#000', border: slotForm.arbeitsbereichIds.includes(wa.id) ? 'none' : '1px solid #dee2e6' }}>
                {wa.icon} {wa.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>4. Optionale Beschreibung</label>
          <input value={slotForm.description} onChange={e => setSlotForm({ ...slotForm, description: e.target.value })} placeholder="Besondere Hinweise für diesen Slot..." style={{ ...inputStyle, width: '100%', maxWidth: 500 }} />
        </div>

        <div style={{ marginTop: 10 }}>
          <button onClick={saveSlot} style={{ padding: '10px 24px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 15, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 'bold' }}>
            {editingSlotId ? '💾 Job-Slot speichern' : `➕ ${slotForm.dates.length * slotForm.arbeitsbereichIds.length} Job-Slots generieren`}
          </button>
          {editingSlotId && (
            <button onClick={() => { setEditingSlotId(null); setSlotForm({ dates: [], zeitslotId: 0, arbeitsbereichIds: [], description: '' }); }} style={{ ...btnStyleSecondary, marginLeft: 10, padding: '10px 20px' }}>Abbrechen</button>
          )}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e9ecef', margin: '30px 0' }} />
      <h4 style={{ fontSize: 18, marginBottom: 16, fontWeight: 'bold' }}>📅 Kalender-Übersicht</h4>
      
      {/* Date Selector for Matrix */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 8 }}>
        {tournamentDays.map(d => (
          <button key={d} onClick={() => setActiveDate(d)} style={{ padding: '10px 16px', background: activeDate === d ? '#212529' : '#f8f9fa', color: activeDate === d ? '#fff' : '#495057', border: '1px solid #dee2e6', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: activeDate === d ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>
            {new Date(d).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}
          </button>
        ))}
      </div>

      {/* Matrix Table (Outlook Style Timeline) */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #dee2e6' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, background: '#fff' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 16px', background: '#f8f9fa', borderRight: '1px solid #dee2e6', borderBottom: '2px solid #dee2e6', width: 140, position: 'sticky', left: 0, zIndex: 10 }}>Zeitslot</th>
              {workAreas.map(wa => (
                <th key={wa.id} style={{ padding: '12px 16px', background: '#f8f9fa', borderBottom: '2px solid #dee2e6', borderRight: '1px solid #dee2e6', textAlign: 'center', minWidth: 160 }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{wa.icon}</div>
                  <div>{wa.name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...globalTimeSlots].sort((a,b) => a.order - b.order).map(zs => (
              <tr key={zs.id}>
                {/* Zeit-Spalte */}
                <td style={{ padding: '12px 16px', borderRight: '1px solid #dee2e6', borderBottom: '1px solid #dee2e6', background: '#f8f9fa', position: 'sticky', left: 0, fontWeight: 'bold', color: '#495057' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: zs.color }}></span>
                    {zs.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>{zs.startTime} - {zs.endTime}</div>
                </td>
                
                {/* Arbeitsbereiche-Spalten */}
                {workAreas.map(wa => {
                  const slots = slotsOnActiveDate.filter(s => s.zeitslotId === zs.id && s.arbeitsbereichId === wa.id);
                  return (
                    <td key={wa.id} style={{ padding: '8px', borderRight: '1px solid #dee2e6', borderBottom: '1px solid #dee2e6', verticalAlign: 'top', background: '#fff' }}>
                      {slots.length === 0 ? (
                        <div style={{ height: '100%', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e9ecef', fontSize: 20 }}>-</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {slots.map(slot => {
                            const assigned = volunteerShifts.filter(vs => vs.shiftId === slot.id);
                            const count = assigned.length;
                            const isFull = count >= (slot.maxVolunteers || 0);
                            const isPartial = count > 0 && !isFull;
                            const bgColor = isFull ? '#d1e7dd' : isPartial ? '#fff3cd' : '#f8d7da';
                            const borderColor = isFull ? '#badbcc' : isPartial ? '#ffeeba' : '#f5c6cb';
                            const textColor = isFull ? '#0f5132' : isPartial ? '#856404' : '#721c24';
                            
                            return (
                              <div key={slot.id} style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 8, padding: 8, position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: 12, fontWeight: 'bold', color: textColor, marginBottom: 4 }}>
                                  {count}/{slot.maxVolunteers} Helfer
                                </div>
                                {slot.description && <div style={{ fontSize: 11, color: '#666', marginBottom: 4, fontStyle: 'italic' }}>{slot.description}</div>}
                                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                                  <button onClick={() => {
                                    setEditingSlotId(slot.id);
                                    setSlotForm({ dates: [slot.date.split('T')[0]], zeitslotId: slot.zeitslotId || 0, arbeitsbereichIds: slot.arbeitsbereichId ? [slot.arbeitsbereichId] : [], description: slot.description || '' });
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                  }} style={{ flex: 1, padding: '4px', background: '#fff', border: `1px solid ${borderColor}`, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✏️</button>
                                  <button onClick={() => deleteSlot(slot.id)} style={{ flex: 1, padding: '4px', background: '#fff', border: `1px solid ${borderColor}`, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>🗑️</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
