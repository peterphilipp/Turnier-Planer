import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getShifts, getArbeitsbereiche, getZeitSlots, apiPost, apiPatch, apiDelete } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, Shift, Arbeitsbereich, Zeitslot, Tournament } from '../shared';

export default function Jobslots({ selectedTournament, tournament, adminPrimary }: { selectedTournament: number | null, tournament: Tournament | null, adminPrimary: string }) {
  const queryClient = useQueryClient();

  const { data: jobSlots = [], isFetching } = useQuery<Shift[]>({
    queryKey: ['shifts', selectedTournament],
    queryFn: () => getShifts(selectedTournament),
    enabled: !!selectedTournament
  });
  
  const { data: arbeitsbereiche = [] } = useQuery<Arbeitsbereich[]>({ queryKey: ['arbeitsbereiche'], queryFn: getArbeitsbereiche });
  const { data: zeitSlots = [] } = useQuery<Zeitslot[]>({ queryKey: ['zeitSlots'], queryFn: getZeitSlots });
  
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [slotForm, setSlotForm] = useState({ dates: [] as string[], zeitslotId: 0 as number, arbeitsbereichIds: [] as number[], description: '' });
  
  const [filterDate, setFilterDate] = useState('');
  const [filterAb, setFilterAb] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const saveSlot = async () => {
    if (!selectedTournament || slotForm.dates.length === 0 || !slotForm.zeitslotId || slotForm.arbeitsbereichIds.length === 0) {
      return alert('Bitte Datum, Zeitslot und mindestens einen Bereich wählen.');
    }
    
    const zs = zeitSlots.find(z => z.id === slotForm.zeitslotId);
    if (!zs) return;
    const slotName = `${zs.name} (${zs.startTime} - ${zs.endTime})`;

    if (editingSlotId) {
      const date = slotForm.dates[0];
      await apiPatch(`/api/shifts/${editingSlotId}`, { 
        date, 
        zeitslotId: slotForm.zeitslotId, 
        arbeitsbereichId: slotForm.arbeitsbereichIds[0], 
        maxVolunteers: arbeitsbereiche.find(a => a.id === slotForm.arbeitsbereichIds[0])?.maxVolunteers || 8, 
        description: slotForm.description || null, 
        slot: slotName 
      });
    } else {
      for (const date of slotForm.dates) {
        for (const abId of slotForm.arbeitsbereichIds) {
          const maxVol = arbeitsbereiche.find(a => a.id === abId)?.maxVolunteers || 8;
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
    if (!confirm('Job-Slot löschen?')) return;
    await apiDelete(`/api/shifts/${id}`);
    queryClient.invalidateQueries({ queryKey: ['shifts', selectedTournament] });
  };

  if (!selectedTournament) {
    return <div style={{ padding: 24, background: '#fff', borderRadius: 16 }}>Bitte wähle zunächst oben ein Turnier aus.</div>;
  }

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

  const toggleDate = (d: string) => {
    if (editingSlotId) { setSlotForm({ ...slotForm, dates: [d] }); return; }
    setSlotForm(prev => ({ ...prev, dates: prev.dates.includes(d) ? prev.dates.filter(x => x !== d) : [...prev.dates, d] }));
  };

  const toggleAb = (id: number) => {
    if (editingSlotId) { setSlotForm({ ...slotForm, arbeitsbereichIds: [id] }); return; }
    setSlotForm(prev => ({ ...prev, arbeitsbereichIds: prev.arbeitsbereichIds.includes(id) ? prev.arbeitsbereichIds.filter(x => x !== id) : [...prev.arbeitsbereichIds, id] }));
  };

  const sortedSlots = [...jobSlots].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.zeitslot && b.zeitslot) return a.zeitslot.order - b.zeitslot.order;
    return a.slot.localeCompare(b.slot);
  });

  const filteredSlots = sortedSlots.filter(s => {
    if (filterDate && s.date !== filterDate) return false;
    if (filterAb && String(s.arbeitsbereichId) !== filterAb) return false;
    if (filterSearch && !s.slot.toLowerCase().includes(filterSearch.toLowerCase()) && !s.arbeitsbereich?.name.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>📋 Job-Slots erstellen (Bedarf)</h3>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>Lege hier fest, an welchen Tagen, in welchen Zeitslots und für welche Arbeitsbereiche Helfer benötigt werden.</p>

      {/* Formular für Job-Slots */}
      <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 12, marginBottom: 30, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>1. Datum wählen {editingSlotId ? '(Nur eins möglich)' : '(Mehrfachauswahl)'}</label>
          <p style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>{tournamentDays.length} Tage: {tournamentDays.map(d => new Date(d).toLocaleDateString('de-DE')).join(', ')}</p>
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
            {zeitSlots.map(zs => (
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
            {arbeitsbereiche.map(ab => (
              <button key={ab.id} onClick={() => toggleAb(ab.id)} style={{ ...btnStyle, background: slotForm.arbeitsbereichIds.includes(ab.id) ? adminPrimary : '#fff', color: slotForm.arbeitsbereichIds.includes(ab.id) ? '#fff' : '#000', border: slotForm.arbeitsbereichIds.includes(ab.id) ? 'none' : '1px solid #dee2e6' }}>
                {ab.icon} {ab.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>4. Optionale Beschreibung</label>
          <input value={slotForm.description} onChange={e => setSlotForm({ ...slotForm, description: e.target.value })} placeholder="Besondere Hinweise für diesen Slot..." style={{ ...inputStyle, width: '100%', maxWidth: 500 }} />
        </div>

        <div style={{ marginTop: 10 }}>
          <button onClick={saveSlot} style={{ padding: '10px 24px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 15, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {editingSlotId ? '💾 Job-Slot speichern' : `➕ ${slotForm.dates.length * slotForm.arbeitsbereichIds.length} Job-Slots generieren`}
          </button>
          {editingSlotId && (
            <button onClick={() => { setEditingSlotId(null); setSlotForm({ dates: [], zeitslotId: 0, arbeitsbereichIds: [], description: '' }); }} style={{ ...btnStyle, marginLeft: 10, padding: '10px 20px' }}>Abbrechen</button>
          )}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e9ecef', margin: '30px 0' }} />
      <h4 style={{ fontSize: 16, marginBottom: 16 }}>Vorhandene Job-Slots ({filteredSlots.length})</h4>
      
      {/* Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={inputStyle} />
        <select value={filterAb} onChange={e => setFilterAb(e.target.value)} style={inputStyle}>
          <option value="">Alle Bereiche</option>
          {arbeitsbereiche.map(ab => <option key={ab.id} value={ab.id}>{ab.name}</option>)}
        </select>
        <input placeholder="Suchen..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
      </div>

      {/* Tabelle */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={thStyle}>Datum</th>
              <th style={thStyle}>Zeit / Slot</th>
              <th style={thStyle}>Bereich</th>
              <th style={thStyle}>Max Helfer</th>
              <th style={thStyle}>Aktion</th>
            </tr>
          </thead>
          <tbody>
            {filteredSlots.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>{new Date(s.date).toLocaleDateString('de-DE')}</td>
                <td style={tdStyle}>
                  {s.zeitslot && <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: s.zeitslot.color, marginRight: 6 }}></span>}
                  {s.slot}
                </td>
                <td style={tdStyle}>{s.arbeitsbereich ? `${s.arbeitsbereich.icon} ${s.arbeitsbereich.name}` : '–'}</td>
                <td style={tdStyle}>{s.maxVolunteers}</td>
                <td style={tdStyle}>
                  <button onClick={() => {
                    setEditingSlotId(s.id);
                    setSlotForm({ dates: [s.date], zeitslotId: s.zeitslotId || 0, arbeitsbereichIds: s.arbeitsbereichId ? [s.arbeitsbereichId] : [], description: s.description || '' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', border: 'none', marginRight: 6 }}>✏️</button>
                  <button onClick={() => deleteSlot(s.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}>🗑️</button>
                </td>
              </tr>
            ))}
            {filteredSlots.length === 0 && <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#666', padding: 20 }}>{isFetching ? 'Lade Daten...' : 'Keine Job-Slots gefunden.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
