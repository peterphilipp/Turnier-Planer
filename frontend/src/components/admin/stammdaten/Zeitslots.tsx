import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getZeitSlots, apiPost, apiPatch, apiDelete } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, Zeitslot } from '../shared';

export default function Zeitslots({ adminPrimary }: { adminPrimary: string }) {
  const queryClient = useQueryClient();
  const { data: zeitSlots = [] } = useQuery<Zeitslot[]>({ queryKey: ['zeitSlots'], queryFn: getZeitSlots });
  
  const [zsForm, setZsForm] = useState({ name: '', startTime: '09:00', endTime: '10:00', color: '#3b98f8', order: 1 });
  const [editingZs, setEditingZs] = useState<number | null>(null);

  const saveZeitslot = async () => {
    if (!zsForm.name.trim()) return await modal.alert({ title: 'Hinweis', message: 'Name erforderlich!' });
    if (editingZs) { await apiPatch(`/api/zeit-slots/${editingZs}`, zsForm); }
    else { await apiPost('/api/zeit-slots', zsForm); }
    queryClient.invalidateQueries({ queryKey: ['zeitSlots'] });
    setZsForm({ name: '', startTime: '09:00', endTime: '10:00', color: '#3b98f8', order: 1 });
    setEditingZs(null);
  };

  const deleteZeitslot = async (id: number) => {
    if (!(await modal.confirm({ title: 'Zeitslot löschen', message: 'Möchtest du diesen Zeitslot wirklich löschen?', variant: 'danger' }))) return;
    await apiDelete(`/api/zeit-slots/${id}`);
    queryClient.invalidateQueries({ queryKey: ['zeitSlots'] });
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>🕐 Zeitslots</h3>
      
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={zsForm.name} onChange={e => setZsForm({ ...zsForm, name: e.target.value })} placeholder="Name" style={{ ...inputStyle, width: 200 }} />
        <input type="time" value={zsForm.startTime} onChange={e => setZsForm({ ...zsForm, startTime: e.target.value })} style={inputStyle} />
        <input type="time" value={zsForm.endTime} onChange={e => setZsForm({ ...zsForm, endTime: e.target.value })} style={inputStyle} />
        <input type="color" value={zsForm.color} onChange={e => setZsForm({ ...zsForm, color: e.target.value })} style={{ width: 44, height: 38, padding: 0, border: '1px solid #dee2e6', borderRadius: 8, cursor: 'pointer' }} />
        <input type="number" value={zsForm.order} onChange={e => setZsForm({ ...zsForm, order: parseInt(e.target.value) || 1 })} placeholder="Reihenfolge" style={{ ...inputStyle, width: 80 }} title="Reihenfolge" />
        
        <button onClick={saveZeitslot} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          {editingZs ? '💾 Speichern' : '➕ Hinzufügen'}
        </button>
        {editingZs && <button onClick={() => { setEditingZs(null); setZsForm({ name: '', startTime: '09:00', endTime: '10:00', color: '#3b98f8', order: 1 }); }} style={{ ...btnStyle, background: '#e9ecef' }}>Abbrechen</button>}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Reihenfolge</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Von</th>
            <th style={thStyle}>Bis</th>
            <th style={thStyle}>Farbe</th>
            <th style={thStyle}>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {zeitSlots.sort((a, b) => a.order - b.order).map(zs => (
            <tr key={zs.id}>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{zs.order}</td>
              <td style={tdStyle}>{zs.name}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{zs.startTime}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{zs.endTime}</td>
              <td style={tdStyle}><div style={{ background: zs.color, width: 40, height: 20, borderRadius: 4 }}></div></td>
              <td style={tdStyle}>
                <button onClick={() => { setEditingZs(zs.id); setZsForm({ name: zs.name, startTime: zs.startTime, endTime: zs.endTime, color: zs.color, order: zs.order }); }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', border: 'none', marginRight: 6 }}>✏️</button>
                <button onClick={() => deleteZeitslot(zs.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}>🗑️</button>
              </td>
            </tr>
          ))}
          {zeitSlots.length === 0 && <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#666', padding: 24 }}>Keine Zeitslots vorhanden.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
