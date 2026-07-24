import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWorkAreas, apiPost, apiPatch, apiDelete } from '../../../api';
import { WorkArea, useSortableData, confirmWithImpact } from '../shared';
import EditModal from '../EditModal';

const emojiList = ['🏪', '🍳', '🔥', '🎪', '🎯', '⚽', '🍰', '☕', '🥤', '🏆', '📦', '🗑️', '💰', '🎁', '🎵', '🎠', '🧸', '🎴', '🎲', '🏅', '🥇', '🎖️', '📋', '✅', '❌', '⏰', '📍', '📞', '🔧', '📢', '📣', '📝'];

export default function WorkAreas({ adminPrimary }: { adminPrimary: string }) {
  const queryClient = useQueryClient();
  const { data: workAreas = [] } = useQuery<WorkArea[]>({ queryKey: ['workAreas'], queryFn: getWorkAreas });
  
  const { items: sortedWorkAreas, requestSort, getSortIndicator } = useSortableData(workAreas, { key: 'name', direction: 'asc' });

  const [abForm, setAbForm] = useState({ name: '', icon: '📍', color: '#3b98f8', minVolunteers: 2, maxVolunteers: 8 });
  const [editingAb, setEditingAb] = useState<number | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const saveWorkArea = async () => {
    if (!abForm.name.trim()) return await modal.alert({ title: 'Hinweis', message: 'Name erforderlich!' });
    if (editingAb) { await apiPatch(`/api/work-areas/${editingAb}`, abForm); }
    else { await apiPost('/api/work-areas', abForm); }
    queryClient.invalidateQueries({ queryKey: ['workAreas'] });
    setAbForm({ name: '', icon: '📍', color: '#3b98f8', minVolunteers: 2, maxVolunteers: 8 });
    setEditingAb(null);
  };

  const deleteWorkArea = async (ab: WorkArea) => {
    if (!(await confirmWithImpact('workArea', ab.id, ab.name))) return;
    await apiDelete(`/api/work-areas/${ab.id}`);
    queryClient.invalidateQueries({ queryKey: ['workAreas'] });
  };

  const openEdit = (ab: WorkArea) => { setEditingAb(ab.id); setAbForm({ name: ab.name, icon: ab.icon, color: ab.color, minVolunteers: ab.minVolunteers, maxVolunteers: ab.maxVolunteers }); setEmojiPickerOpen(false); };
  const closeEdit = () => { setEditingAb(null); setAbForm({ name: '', icon: '📍', color: '#3b98f8', minVolunteers: 2, maxVolunteers: 8 }); setEmojiPickerOpen(false); };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>📍 Arbeitsbereiche</h3>
      
      {/* Neue ARB Form */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={abForm.name} onChange={e => setAbForm({ ...abForm, name: e.target.value })} placeholder="Name" style={{ flex: 1, minWidth: 200, padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} />
        <div style={{ position: 'relative' }}>
          <button onClick={() => setEmojiPickerOpen(!emojiPickerOpen)} style={{ fontSize: 24, padding: '6px 12px', border: '1px solid #dee2e6', background: '#f8f9fa', borderRadius: 8, cursor: 'pointer' }}>{abForm.icon}</button>
          {emojiPickerOpen && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 10, background: '#fff', border: '1px solid #dee2e6', borderRadius: 12, position: 'absolute', top: 45, zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', width: 280 }}>
              {emojiList.map(e => (<button key={e} onClick={() => { setAbForm({ ...abForm, icon: e }); setEmojiPickerOpen(false); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4 }}>{e}</button>))}
            </div>
          )}
        </div>
        <input type="color" value={abForm.color} onChange={e => setAbForm({ ...abForm, color: e.target.value })} style={{ width: 44, height: 38, padding: 0, border: '1px solid #dee2e6', borderRadius: 8, cursor: 'pointer' }} />
        <input type="number" value={abForm.minVolunteers} onChange={e => setAbForm({ ...abForm, minVolunteers: parseInt(e.target.value) || 0 })} placeholder="Min" style={{ width: 60, padding: '10px 8px', border: '1px solid #dee2e6', borderRadius: 8 }} />
        <input type="number" value={abForm.maxVolunteers} onChange={e => setAbForm({ ...abForm, maxVolunteers: parseInt(e.target.value) || 0 })} placeholder="Max" style={{ width: 60, padding: '10px 8px', border: '1px solid #dee2e6', borderRadius: 8 }} />
        <button onClick={saveWorkArea} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>➕ Hinzufügen</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '2px solid #e9ecef' }}><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Icon</th><th onClick={() => requestSort('name')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>Name{getSortIndicator('name')}</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Farbe</th><th onClick={() => requestSort('minVolunteers')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right', cursor: 'pointer' }}>Min{getSortIndicator('minVolunteers')}</th><th onClick={() => requestSort('maxVolunteers')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right', cursor: 'pointer' }}>Max{getSortIndicator('maxVolunteers')}</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Aktion</th></tr></thead>
        <tbody>
          {sortedWorkAreas.map(ab => (
            <tr key={ab.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '10px 12px', fontSize: 24, textAlign: 'center' }}>{ab.icon}</td>
              <td style={{ padding: '10px 12px', fontWeight: 500 }}>{ab.name}</td>
              <td style={{ padding: '10px 12px' }}><div style={{ background: ab.color, width: 40, height: 20, borderRadius: 4 }} /></td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{ab.minVolunteers}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{ab.maxVolunteers}</td>
              <td style={{ padding: '10px 12px' }}>
                <button onClick={() => openEdit(ab)} style={{ padding: '6px 10px', border: 'none', background: '#fff3cd', color: '#856404', borderRadius: 6, cursor: 'pointer', marginRight: 4 }}>✏️</button>
                <button onClick={() => deleteWorkArea(ab)} style={{ padding: '6px 10px', border: 'none', background: '#ffe3e3', color: '#dc3545', borderRadius: 6, cursor: 'pointer' }}>🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit Modal */}
      {editingAb && (
        <EditModal title="Arbeitsbereich bearbeiten" onClose={closeEdit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input value={abForm.name} onChange={e => setAbForm({ ...abForm, name: e.target.value })} placeholder="Name" style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} />
            
            {/* Emoji Picker */}
            <div>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {emojiList.map(e => (
                  <button key={e} onClick={() => setAbForm({ ...abForm, icon: e })} style={{ fontSize: 20, padding: '6px 8px', border: abForm.icon === e ? '2px solid #0d6efd' : '1px solid #dee2e6', background: abForm.icon === e ? '#e8f4fd' : '#fff', borderRadius: 8, cursor: 'pointer' }}>{e}</button>
                ))}
              </div>
            </div>

            {/* Farben & Helfer */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Farbe</label><input type="color" value={abForm.color} onChange={e => setAbForm({ ...abForm, color: e.target.value })} style={{ width: '100%', height: 44, padding: 0, border: '1px solid #dee2e6', borderRadius: 8, cursor: 'pointer' }} /></div>
              <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Min Helfer</label><input type="number" value={abForm.minVolunteers} onChange={e => setAbForm({ ...abForm, minVolunteers: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} /></div>
              <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Max Helfer</label><input type="number" value={abForm.maxVolunteers} onChange={e => setAbForm({ ...abForm, maxVolunteers: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} /></div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #e9ecef' }}>
              <button onClick={closeEdit} style={{ padding: '10px 20px', border: '1px solid #dee2e6', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>Abbrechen</button>
              <button onClick={saveWorkArea} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>💾 Speichern</button>
            </div>
          </div>
        </EditModal>
      )}
    </div>
  );
}
