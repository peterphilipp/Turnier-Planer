import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTournaments, getVolunteers, getZeitSlots, getShifts, getVolunteerShifts, getArbeitsbereiche, apiPost, apiDelete, apiPatch } from '../../../api';

import { Tournament, Shift, Zeitslot, VolunteerShift, Volunteer, Arbeitsbereich } from '../shared';
export default function Buchungen({ selectedTournament, adminPrimary }: { selectedTournament: number | null, adminPrimary: string }) {
      const [selectedDate, setSelectedDate] = useState('');
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedVolunteer, setSelectedVolunteer] = useState('');
  const [newVolunteerName, setNewVolunteerName] = useState('');
  const [showNewHelper, setShowNewHelper] = useState(false);
  const [newHelperName, setNewHelperName] = useState('');
  const [editingShift, setEditingShift] = useState<VolunteerShift | null>(null);
  const [editSlotId, setEditSlotId] = useState<number>(0);
  const [editVolunteerId, setEditVolunteerId] = useState<number>(0);
  const [editAreaId, setEditAreaId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: tournaments = [] } = useQuery<Tournament[]>({ queryKey: ['tournaments'], queryFn: getTournaments });
  const { data: volunteers = [] } = useQuery<Volunteer[]>({ queryKey: ['volunteers', selectedTournament], queryFn: () => getVolunteers(selectedTournament), enabled: !!selectedTournament });
  const { data: zeitSlots = [] } = useQuery<Zeitslot[]>({ queryKey: ['zeitSlots'], queryFn: getZeitSlots });
  const { data: arbeitsbereiche = [] } = useQuery<Arbeitsbereich[]>({ queryKey: ['arbeitsbereiche'], queryFn: getArbeitsbereiche });

  const { data: jobSlots = [], isFetching: busySlots } = useQuery<Shift[]>({
    queryKey: ['shifts', selectedTournament],
    queryFn: () => getShifts(selectedTournament),
    enabled: !!selectedTournament
  });

  const { data: volunteerShifts = [], isFetching: busyVolShifts } = useQuery<VolunteerShift[]>({
    queryKey: ['volunteerShifts', selectedTournament],
    queryFn: () => getVolunteerShifts(selectedTournament),
    enabled: !!selectedTournament
  });



  const busy = busySlots || busyVolShifts;

  // Turnier-Tage
  const tournamentDays = useMemo(() => {
    if (!selectedTournament) return [];
    const t = tournaments.find(t => t.id === selectedTournament);
    if (!t) return [];
    const days: string[] = [];
    const start = new Date(t.startDate);
    const end = new Date(t.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [selectedTournament, tournaments]);

  // Standard-Datum: erster Turniertag
  useEffect(() => {
    if (!selectedDate && tournamentDays.length > 0) {
      setSelectedDate(tournamentDays[0]);
    }
  }, [tournamentDays, selectedDate]);

  // Job-Slots für ein Datum + Zeitslot gefiltert
  const filteredSlots = useMemo(() => {
    if (!selectedDate) return [];
    return jobSlots
      .filter(s => s.date.split('T')[0] === selectedDate)
      .sort((a, b) => {
        const aOrder = a.zeitslot?.order ?? 99;
        const bOrder = b.zeitslot?.order ?? 99;
        return aOrder - bOrder;
      });
  }, [jobSlots, selectedDate]);

  // Job-Slots für ausgewählten Bereich gefiltert
  const areaSlots = useMemo(() => {
    if (!selectedArea) return filteredSlots;
    return filteredSlots.filter(s => s.arbeitsbereichId === selectedArea);
  }, [filteredSlots, selectedArea]);

  // Zuordnung pro Job-Slot
  const slotAssignments = useMemo(() => {
    if (!selectedTournament) return {};
    const map: Record<number, VolunteerShift[]> = {};
    volunteerShifts.forEach(vs => {
      const vsDate = new Date(vs.date).toISOString().split('T')[0];
      if (vsDate !== selectedDate) return;
      const slot = jobSlots.find(s =>
        s.tournamentId === selectedTournament &&
        s.date.split('T')[0] === vsDate &&
        (!s.arbeitsbereichId || String(s.arbeitsbereichId) === String(vs.arbeitsbereichId ?? vs.areaId))
      );
      if (slot) {
        if (!map[slot.id]) map[slot.id] = [];
        map[slot.id].push(vs);
      }
    });
    return map;
  }, [volunteerShifts, jobSlots, selectedTournament, selectedDate]);

  // Helfer-Status pro Tag
  const helperStatusByDay = useMemo(() => {
    if (!selectedTournament) return {};
    const map: Record<string, { count: number; slots: number[] }> = {};
    volunteerShifts.forEach(vs => {
      const vsDate = new Date(vs.date).toISOString().split('T')[0];
      if (!map[vsDate]) map[vsDate] = { count: 0, slots: [] };
      map[vsDate].count++;
      map[vsDate].slots.push(vs.id);
    });
    return map;
  }, [volunteerShifts, selectedTournament]);

  // Status für einen Job-Slot
  const getSlotStatus = (slotId: number) => {
    const assignments = slotAssignments[slotId] || [];
    const slot = jobSlots.find(s => s.id === slotId);
    if (!slot) return { emoji: '⚪', color: '#adb5bd', label: '–' };
    const max = slot.maxVolunteers || 8;
    if (assignments.length === 0) return { emoji: '🔴', color: '#dc3545', label: `0/${max}` };
    if (assignments.length >= max) return { emoji: '🟢', color: '#198754', label: `${assignments.length}/${max}` };
    return { emoji: '🟡', color: '#ffc107', label: `${assignments.length}/${max}` };
  };

  // Helfer anlegen
  const addVolunteer = async () => {
    if (!newVolunteerName.trim()) return;
    await apiPost('/api/volunteers', { name: newVolunteerName.trim(), roles: ['Helfer'] });
    queryClient.invalidateQueries({ queryKey: ['volunteers'] });
    setNewVolunteerName('');
  };

  // Helfer inline anlegen + auswählen
  const addVolunteerInline = async () => {
    if (!newHelperName.trim()) return;
    await apiPost('/api/volunteers', { name: newHelperName.trim(), roles: ['Helfer'], tournamentId: selectedTournament });
    const all = await getVolunteers(selectedTournament);
    queryClient.setQueryData(['volunteers', selectedTournament], all);
    const last = all[all.length - 1];
    setSelectedVolunteer(String(last.id));
    setShowNewHelper(false);
    setNewHelperName('');
  };

  // Helfer einschichten
  const assignToSlot = async (slotId: number) => {
    if (!selectedTournament || !selectedVolunteer) return;
    const slot = jobSlots.find(s => s.id === slotId);
    if (!slot) return;
    const slotName = slot.zeitslot ? `${slot.zeitslot.name} (${slot.zeitslot.startTime}–${slot.zeitslot.endTime})` : slot.slot || '–';
    const existing = volunteerShifts.find(vs =>
      vs.volunteerId === parseInt(selectedVolunteer) &&
      new Date(vs.date).toISOString().split('T')[0] === selectedDate &&
      vs.slot === slotName &&
      (!slot.arbeitsbereichId || String(vs.arbeitsbereichId ?? vs.areaId) === String(slot.arbeitsbereichId))
    );
    if (existing) return alert(`${volunteers.find(v => v.id === parseInt(selectedVolunteer))?.name} ist an diesem Tag bereits in diesem Slot.`);

    const area = slot.arbeitsbereich;
    await apiPost('/api/volunteer-shifts', {
      volunteerId: parseInt(selectedVolunteer),
      tournamentId: selectedTournament,
      date: selectedDate,
      slot: slotName,
      role: area ? `${area.name} Schicht` : 'Schicht',
      areaId: slot.arbeitsbereichId,
    });
    queryClient.invalidateQueries({ queryKey: ['volunteerShifts', selectedTournament] });
  };

  // Zuweisung entfernen
  const removeAssignment = async (id: number) => {
    await apiDelete(`/api/volunteer-shifts/${id}`);
    queryClient.invalidateQueries({ queryKey: ['volunteerShifts', selectedTournament] });
  };

  // Edit speichern
  const saveEdit = async () => {
    if (!editingShift) return;
    const slot = zeitSlots.find(z => z.id === editSlotId);
    const area = arbeitsbereiche.find(a => a.id === editAreaId);
    await apiPatch(`/api/volunteer-shifts/${editingShift.id}`, {
      slot: slot?.name || editingShift.slot,
      volunteerId: editVolunteerId || editingShift.volunteerId,
      areaId: area?.id || null,
    });
    queryClient.invalidateQueries({ queryKey: ['volunteerShifts', selectedTournament] });
    setEditingShift(null);
  };

  const tdStyle: React.CSSProperties = { padding: '6px', border: '1px solid #dee2e6', verticalAlign: 'top', minHeight: 40 };
  const thStyle: React.CSSProperties = { ...tdStyle, background: '#f8f9fa', fontWeight: 'bold', fontSize: 12 };
  const btnStyle: React.CSSProperties = { padding: '4px 10px', cursor: 'pointer', border: '1px solid #ced4da', borderRadius: 4, background: '#e9ecef', fontSize: 12 };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 16 }}>📅 Dienstplan</h2>

      {!selectedTournament ? <div style={{ padding: 24, background: '#fff', borderRadius: 16 }}>Bitte wähle zunächst oben ein Turnier aus.</div> : (
        <>
          {/* Filter: Datum + Bereich */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 2, fontSize: 13 }}>Datum:</label>
              <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 4 }}>
                {tournamentDays.map(d => (
                  <option key={d} value={d}>{new Date(d).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 2, fontSize: 13 }}>Bereich:</label>
              <select value={selectedArea || ''} onChange={e => setSelectedArea(e.target.value ? parseInt(e.target.value) : null)}
                style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 4 }}>
                <option value="">Alle Bereiche</option>
                {arbeitsbereiche.map(a => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 2, fontSize: 13 }}>Helfer:</label>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <select value={selectedVolunteer} onChange={e => { setSelectedVolunteer(e.target.value); setShowNewHelper(false); }}
                  style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 4, minWidth: 180 }}>
                  <option value="">-- Bitte wählen --</option>
                  {volunteers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <button onClick={() => setShowNewHelper(!showNewHelper)}
                  style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 4, background: showNewHelper ? '#d1e7dd' : '#f8f9fa', cursor: 'pointer', fontSize: 13 }}>
                  {showNewHelper ? '❌' : '+ Neuer'}
                </button>
              </div>
              {showNewHelper && (
                <div style={{ marginTop: 4, display: 'flex', gap: 4 }}>
                  <input placeholder="Name des neuen Helfers" value={newHelperName}
                    onChange={e => setNewHelperName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { addVolunteerInline(); } }}
                    autoFocus
                    style={{ flex: 1, padding: '6px 10px', border: '1px solid #0d6efd', borderRadius: 4, background: '#e7f3ff' }} />
                  <button onClick={addVolunteerInline}
                    style={{ padding: '6px 12px', background: '#198754', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
                    ✓ Anlegen
                  </button>
                  <button onClick={() => { setShowNewHelper(false); setNewHelperName(''); }}
                    style={{ padding: '6px 10px', background: '#f8f9fa', border: '1px solid #ced4da', borderRadius: 4, cursor: 'pointer' }}>
                    ❌
                  </button>
                </div>
              )}
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button onClick={async () => {
                if (!selectedVolunteer) return alert('Bitte Helfer wählen!');
                const slotsToAssign = selectedArea
                  ? areaSlots
                  : filteredSlots;
                let created = 0;
                for (const slot of slotsToAssign) {
                  const slotName = slot.zeitslot ? `${slot.zeitslot.name} (${slot.zeitslot.startTime}–${slot.zeitslot.endTime})` : slot.slot || '–';
                  const existing = volunteerShifts.find(vs =>
                    vs.volunteerId === parseInt(selectedVolunteer) &&
                    new Date(vs.date).toISOString().split('T')[0] === selectedDate &&
                    vs.slot === slotName &&
                    (!slot.arbeitsbereichId || String(vs.arbeitsbereichId ?? vs.areaId) === String(slot.arbeitsbereichId))
                  );
                  if (!existing) {
                    const area = slot.arbeitsbereich;
                    await apiPost('/api/volunteer-shifts', {
                      volunteerId: parseInt(selectedVolunteer),
                      tournamentId: selectedTournament,
                      date: selectedDate,
                      slot: slotName,
                      role: area ? `${area.name} Schicht` : 'Schicht',
                      areaId: slot.arbeitsbereichId,
                    });
                    created++;
                  }
                }
                if (created > 0) {
                  queryClient.invalidateQueries({ queryKey: ['volunteerShifts', selectedTournament] });
                  alert(`${created} Schicht${created > 1 ? 'en' : ''} für ${volunteers.find(v => v.id === parseInt(selectedVolunteer))?.name} zugewiesen.`);
                } else {
                  alert('Helfer ist an diesem Tag bereits für alle Slots eingeschichtet.');
                }
              }} style={{ padding: '6px 14px', background: '#198754', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>
                ✅ Alle freien Slots belegen
              </button>
            </div>
          </div>

          {/* Job-Slot Grid */}
          <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, border: '1px solid #dee2e6' }}>
            <h3 style={{ marginTop: 0 }}>
              📋 {selectedDate ? new Date(selectedDate).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' }) : 'Datum wählen'}
              {selectedArea && <span> – {(() => { const a = filteredSlots.find(s => s.arbeitsbereichId === selectedArea)?.arbeitsbereich; return a ? `${a.icon} ${a.name}` : ''; })()}</span>}
              <span style={{ float: 'right', fontSize: 14, color: '#666' }}>{filteredSlots.length} Job-Slots</span>
            </h3>

            {busy && <div style={{ textAlign: 'center', padding: 20, color: '#666' }}>⏳ Lade Daten...</div>}

            {!busy && filteredSlots.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                Keine Job-Slots für diesen Tag. <br />
                <span style={{ fontSize: 13 }}>Lege Job-Slots im Admin-Tab an.</span>
              </div>
            )}

            {!busy && filteredSlots.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 180 }}>Zeitslot</th>
                    <th style={thStyle}>Bereich</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Status</th>
                    <th style={{ ...thStyle, width: 250 }}>Helfer</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 100 }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSlots.map(slot => {
                    const status = getSlotStatus(slot.id);
                    const assignments = slotAssignments[slot.id] || [];
                    const area = slot.arbeitsbereich;
                    return (
                      <tr key={slot.id} style={{ borderBottom: '1px solid #e9ecef' }}>
                        <td style={{ ...tdStyle, fontSize: 12 }}>
                          {slot.zeitslot ? (
                            <span style={{
                              background: slot.zeitslot.color || '#3b98f8',
                              color: '#fff',
                              padding: '3px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 'bold',
                            }}>{slot.zeitslot.name}</span>
                          ) : <span style={{ color: '#adb5bd' }}>–</span>}
                          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                            {slot.zeitslot?.startTime} – {slot.zeitslot?.endTime}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          {area ? (
                            <span style={{
                              background: area.color || '#3b98f8',
                              color: '#fff',
                              padding: '3px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                            }}>{area.icon} {area.name}</span>
                          ) : '–'}
                          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                            Max. {slot.maxVolunteers} Helfer
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', fontSize: 16 }}>
                          <span style={{ color: status.color, fontWeight: 'bold' }}>{status.emoji}</span>
                          <div style={{ fontSize: 11, color: status.color }}>{status.label}</div>
                        </td>
                        <td style={tdStyle}>
                          {assignments.length === 0 && (
                            <span style={{ color: '#adb5bd', fontSize: 12, fontStyle: 'italic' }}>Keine Helfer zugewiesen</span>
                          )}
                          {assignments.map(vs => (
                            <div key={vs.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                              <span style={{ background: '#e7f3ff', color: '#0d6efd', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 'bold' }}>
                                {vs.volunteer?.name || '?'}
                              </span>
                              <button onClick={() => removeAssignment(vs.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', padding: '1px 6px', fontSize: 10 }}>✕</button>
                            </div>
                          ))}
                          {/* Zuweisen */}
                          {selectedVolunteer && !assignments.some(a => a.volunteerId === parseInt(selectedVolunteer)) && (
                            <button onClick={async () => {
                              await assignToSlot(slot.id);
                              const name = volunteers.find(v => v.id === parseInt(selectedVolunteer))?.name || 'Helfer';
                              const slotName = slot.zeitslot?.name || slot.slot || '–';
                              alert(`✅ ${name} → ${slotName}`);
                            }}
                              style={{ width: '100%', marginTop: 4, padding: '4px 0', background: '#d1e7dd', color: '#0f5132', border: '1px solid #a3cfbb', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>
                              + {volunteers.find(v => v.id === parseInt(selectedVolunteer))?.name}
                            </button>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {assignments.length > 0 && (
                            <button onClick={() => {
                              const vs = assignments[0];
                              setEditingShift(vs);
                              setEditVolunteerId(vs.volunteerId);
                              setEditAreaId(vs.arbeitsbereichId ?? vs.areaId);
                              const matchedSlot = jobSlots.find(s =>
                                s.tournamentId === selectedTournament &&
                                s.date.split('T')[0] === new Date(vs.date).toISOString().split('T')[0] &&
                                (!s.arbeitsbereichId || String(s.arbeitsbereichId) === String(vs.arbeitsbereichId ?? vs.areaId))
                              );
                              setEditSlotId(matchedSlot?.zeitslotId || 0);
                            }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', marginRight: 2, fontSize: 11 }}>✏️</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}


      {/* ==================== HELFER TAB ==================== */}
      {/* Edit Modal */}
      {editingShift && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setEditingShift(null)}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 12, minWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>✏️ Zuweisung bearbeiten</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>Zeitslot:</label>
              <select value={editSlotId} onChange={e => setEditSlotId(parseInt(e.target.value))}
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 4 }}>
                <option value={0}>-- Bitte wählen --</option>
                {zeitSlots.sort((a, b) => a.order - b.order).map(zs => (
                  <option key={zs.id} value={zs.id}>{zs.name} ({zs.startTime}–{zs.endTime})</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>Bereich:</label>
              <select value={editAreaId || ''} onChange={e => setEditAreaId(e.target.value ? parseInt(e.target.value) : null)}
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 4 }}>
                <option value="">-- Bitte wählen --</option>
                {arbeitsbereiche.map(a => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold', fontSize: 13 }}>Helfer:</label>
              <select value={editVolunteerId} onChange={e => setEditVolunteerId(parseInt(e.target.value))}
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 4 }}>
                <option value={0}>-- Bitte wählen --</option>
                {volunteers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setEditingShift(null)} style={{ ...btnStyle, background: '#6c757d', color: '#fff' }}>Abbrechen</button>
              <button onClick={saveEdit} style={{ ...btnStyle, background: '#0d6efd', color: '#fff' }}>Speichern</button>
              <button onClick={() => { removeAssignment(editingShift.id); setEditingShift(null); }} style={{ ...btnStyle, background: '#dc3545', color: '#fff' }}>Löschen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
