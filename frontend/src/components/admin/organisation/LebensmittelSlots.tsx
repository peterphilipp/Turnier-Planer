import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFoodDonationSlots, getFoodItems, apiPost, apiPatch, apiDelete } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, FoodDonationSlot, FoodItem, Tournament } from '../shared';

export default function LebensmittelSlots({ selectedTournament, tournament, adminPrimary }: { selectedTournament: number | null, tournament: Tournament | null, adminPrimary: string }) {
  const queryClient = useQueryClient();

  const { data: slots = [] } = useQuery<FoodDonationSlot[]>({
    queryKey: ['foodDonationSlots', selectedTournament],
    queryFn: () => getFoodDonationSlots(selectedTournament),
    enabled: !!selectedTournament
  });
  
  const { data: foodItems = [] } = useQuery<FoodItem[]>({ queryKey: ['foodItems'], queryFn: getFoodItems });
  
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [slotForm, setSlotForm] = useState({ date: '', yearGroup: '', foodItemId: 0, targetQuantity: 0, description: '' });
  
  const [filterYear, setFilterYear] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const saveSlot = async () => {
    if (!selectedTournament || !slotForm.date || !slotForm.yearGroup) {
      return alert('Bitte Datum, Jahrgang und mindestens einen Bereich wählen.');
    }
    
    if (editingSlotId) {
      await apiPatch(`/api/food-donation-slots/${editingSlotId}`, { 
        date: slotForm.date, 
        yearGroup: slotForm.yearGroup, 
        foodItemId: slotForm.foodItemId || null, 
        targetQuantity: slotForm.targetQuantity, 
        description: slotForm.description || null 
      });
    } else {
      await apiPost('/api/food-donation-slots', { 
        tournamentId: selectedTournament, 
        date: slotForm.date, 
        yearGroup: slotForm.yearGroup, 
        foodItemId: slotForm.foodItemId || null, 
        targetQuantity: slotForm.targetQuantity, 
        description: slotForm.description || null 
      });
    }
    queryClient.invalidateQueries({ queryKey: ['foodDonationSlots', selectedTournament] });
    setSlotForm({ date: '', yearGroup: '', foodItemId: 0, targetQuantity: 0, description: '' });
    setEditingSlotId(null);
  };

  const deleteSlot = async (id: number) => {
    if (!confirm('Slot löschen?')) return;
    await apiDelete(`/api/food-donation-slots/${id}`);
    queryClient.invalidateQueries({ queryKey: ['foodDonationSlots', selectedTournament] });
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

  const sortedSlots = [...slots].sort((a, b) => {
    if (a.yearGroup !== b.yearGroup) return a.yearGroup.localeCompare(b.yearGroup);
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const filteredSlots = sortedSlots.filter(s => {
    if (filterYear && s.yearGroup !== filterYear) return false;
    if (filterSearch && !s.yearGroup.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  // Nach Jahrgang gruppieren
  const groupedByYear = useMemo(() => {
    const groups: Record<string, FoodDonationSlot[]> = {};
    filteredSlots.forEach(slot => {
      const key = slot.yearGroup;
      if (!groups[key]) groups[key] = [];
      groups[key].push(slot);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredSlots]);

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>🍞 Lebensmittel-Slots (Jahrgangsplanung)</h3>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>Lege hier fest, welche Jahrgänge an welchen Tagen welche Lebensmittel spenden sollen.</p>

      {/* Formular für Lebensmittel-Slots */}
      <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 12, marginBottom: 30, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>1. Datum wählen</label>
          <p style={{ color: '#666', fontSize: 12, marginBottom: 8 }}>{tournamentDays.length} Tage: {tournamentDays.map(d => new Date(d).toLocaleDateString('de-DE')).join(', ')}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tournamentDays.map(d => (
              <button key={d} onClick={() => setSlotForm({ ...slotForm, date: d })} style={{ padding: '8px 12px', background: slotForm.date === d ? adminPrimary : '#fff', color: slotForm.date === d ? '#fff' : '#000', border: slotForm.date === d ? 'none' : '1px solid #dee2e6', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: slotForm.date === d ? 'bold' : 'normal' }}>
                {new Date(d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>2. Jahrgang (Kind-Jahrgang)</label>
          <input type="text" value={slotForm.yearGroup} onChange={e => setSlotForm({ ...slotForm, yearGroup: e.target.value })} placeholder="z.B. 2016, 2017, 2018..." style={inputStyle} />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>3. Lebensmittel (optional)</label>
          <select value={slotForm.foodItemId} onChange={e => setSlotForm({ ...slotForm, foodItemId: parseInt(e.target.value) || 0 })} style={inputStyle}>
            <option value={0}>-- Alle Artikel --</option>
            {foodItems.map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>4. Soll-Menge</label>
          <input type="number" value={slotForm.targetQuantity} onChange={e => setSlotForm({ ...slotForm, targetQuantity: parseInt(e.target.value) || 0 })} placeholder="0" style={{ ...inputStyle, width: 120 }} />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>5. Optionale Beschreibung</label>
          <input value={slotForm.description} onChange={e => setSlotForm({ ...slotForm, description: e.target.value })} placeholder="Besondere Hinweise..." style={{ ...inputStyle, width: '100%', maxWidth: 500 }} />
        </div>

        <div style={{ marginTop: 10 }}>
          <button onClick={saveSlot} style={{ padding: '10px 24px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 15, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            {editingSlotId ? '💾 Slot speichern' : '➕ Slot erstellen'}
          </button>
          {editingSlotId && (
            <button onClick={() => { setEditingSlotId(null); setSlotForm({ date: '', yearGroup: '', foodItemId: 0, targetQuantity: 0, description: '' }); }} style={{ ...btnStyle, marginLeft: 10, padding: '10px 20px' }}>Abbrechen</button>
          )}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e9ecef', margin: '30px 0' }} />
      <h4 style={{ fontSize: 16, marginBottom: 16 }}>Vorhandene Slots ({filteredSlots.length})</h4>
      
      {/* Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input placeholder="Jahrgang filtern" value={filterYear} onChange={e => setFilterYear(e.target.value)} style={inputStyle} />
        <input placeholder="Suchen..." value={filterSearch} onChange={e => setFilterSearch(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
      </div>

      {/* Tabelle mit zweistufiger Hierarchie */}
      <div style={{ overflowX: 'auto' }}>
        {groupedByYear.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', padding: 20 }}>Keine Lebensmittel-Slots gefunden.</div>
        ) : (
          groupedByYear.map(([yearGroup, slots]) => (
            <div key={yearGroup} style={{ marginBottom: 24 }}>
              <h4 style={{ background: '#f8f9fa', padding: '12px 16px', borderRadius: 10, marginTop: 0, fontSize: 16, fontWeight: '600', borderLeft: '4px solid ' + adminPrimary }}>
                📅 Jahrgang {yearGroup} <span style={{ float: 'right', fontSize: 14, color: '#666' }}>{slots.length} Slot{slots.length !== 1 ? 's' : ''}</span>
              </h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, borderLeft: '2px solid #e9ecef' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, background: '#f8f9fa' }}>Datum</th>
                    <th style={{ ...thStyle, background: '#f8f9fa' }}>Lebensmittel</th>
                    <th style={{ ...thStyle, background: '#f8f9fa' }}>Soll</th>
                    <th style={{ ...thStyle, background: '#f8f9fa' }}>Ist</th>
                    <th style={{ ...thStyle, background: '#f8f9fa' }}>Fortschritt</th>
                    <th style={{ ...thStyle, background: '#f8f9fa' }}>Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map(slot => (
                    <tr key={slot.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={tdStyle}>{new Date(slot.date).toLocaleDateString('de-DE')}</td>
                      <td style={tdStyle}>{slot.foodItem ? `${slot.foodItem.icon} ${slot.foodItem.name}` : 'Alle'}</td>
                      <td style={tdStyle}>{slot.targetQuantity}</td>
                      <td style={tdStyle}>{slot.collected}</td>
                      <td style={tdStyle}>
                        <div style={{ background: '#e9ecef', borderRadius: 4, height: 8, overflow: 'hidden', width: 100 }}>
                          <div style={{ 
                            width: `${slot.targetQuantity > 0 ? Math.min(100, (slot.collected / slot.targetQuantity) * 100) : 0}%`,
                            height: '100%',
                            background: slot.collected >= slot.targetQuantity ? '#198754' : '#ffc107',
                            borderRadius: 4
                          }}></div>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <button onClick={() => {
                          setEditingSlotId(slot.id);
                          setSlotForm({ date: slot.date, yearGroup: slot.yearGroup, foodItemId: slot.foodItemId || 0, targetQuantity: slot.targetQuantity, description: slot.description || '' });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', border: 'none', marginRight: 6 }}>✏️</button>
                        <button onClick={() => deleteSlot(slot.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
