import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getGlobalTimeSlots, apiPost, apiPatch, apiDelete } from '../../../api';
import { btnStyle, btnStyleSecondary, GlobalTimeSlot } from '../shared';
import EditModal from '../EditModal';

export default function GlobalTimeSlots({ adminPrimary }: { adminPrimary: string }) {
  const queryClient = useQueryClient();
  const { data: globalTimeSlots = [] } = useQuery<GlobalTimeSlot[]>({ queryKey: ['globalTimeSlots'], queryFn: getGlobalTimeSlots });
  
  const [zsForm, setZsForm] = useState({ name: '', startTime: '09:00', endTime: '10:00', color: '#3b98f8', order: 1 });
  const [editingZs, setEditingZs] = useState<number | null>(null);

  const saveGlobalTimeSlot = async () => {
    if (!zsForm.name.trim()) return await modal.alert({ title: 'Hinweis', message: 'Name erforderlich!' });
    if (editingZs) { await apiPatch(`/api/global-time-slots/${editingZs}`, zsForm); }
    else { await apiPost('/api/global-time-slots', zsForm); }
    queryClient.invalidateQueries({ queryKey: ['globalTimeSlots'] });
    setZsForm({ name: '', startTime: '09:00', endTime: '10:00', color: '#3b98f8', order: 1 });
    setEditingZs(null);
  };

  const deleteGlobalTimeSlot = async (id: number) => {
    if (!(await modal.confirm({ title: 'Zeitslot löschen', message: 'Möchtest du diesen Zeitslot wirklich löschen?', variant: 'danger' }))) return;
    await apiDelete(`/api/global-time-slots/${id}`);
    queryClient.invalidateQueries({ queryKey: ['globalTimeSlots'] });
  };

  const openEdit = (zs: GlobalTimeSlot) => { setEditingZs(zs.id); setZsForm({ name: zs.name, startTime: zs.startTime, endTime: zs.endTime, color: zs.color, order: zs.order }); };
  const closeEdit = () => { setEditingZs(null); setZsForm({ name: '', startTime: '09:00', endTime: '10:00', color: '#3b98f8', order: 1 }); };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>🕐 Zeitslots</h3>
      
      {/* Neue ZS Form */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={zsForm.name} onChange={e => setZsForm({ ...zsForm, name: e.target.value })} placeholder="Name" style={{ flex: 1, minWidth: 200, padding: '0 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, height: 48 }} />
        <input type="time" value={zsForm.startTime} onChange={e => setZsForm({ ...zsForm, startTime: e.target.value })} style={{ padding: '0 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, height: 48 }} />
        <input type="time" value={zsForm.endTime} onChange={e => setZsForm({ ...zsForm, endTime: e.target.value })} style={{ padding: '0 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, height: 48 }} />
        <input type="color" value={zsForm.color} onChange={e => setZsForm({ ...zsForm, color: e.target.value })} style={{ width: 48, height: 48, padding: 0, border: '1px solid #dee2e6', borderRadius: 8, cursor: 'pointer' }} />
        <input type="number" value={zsForm.order} onChange={e => setZsForm({ ...zsForm, order: parseInt(e.target.value) || 1 })} placeholder="Reihenfolge" style={{ width: 90, padding: '0 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, height: 48 }} />
        <button onClick={saveGlobalTimeSlot} style={{ padding: '0 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, height: 48, minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15 }}>
          <span>➕</span><span>Hinzufügen</span>
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '2px solid #e9ecef' }}><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Reihenfolge</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Name</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>Von</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>Bis</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Farbe</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Aktion</th></tr></thead>
        <tbody>
          {globalTimeSlots.sort((a, b) => a.order - b.order).map(zs => (
            <tr key={zs.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{zs.order}</td>
              <td style={{ padding: '10px 12px', fontWeight: 500 }}>{zs.name}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{zs.startTime}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{zs.endTime}</td>
              <td style={{ padding: '10px 12px' }}><div style={{ background: zs.color, width: 40, height: 20, borderRadius: 4 }} /></td>
              <td style={{ padding: '8px 12px' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEdit(zs)} style={{ width: 40, height: 40, border: 'none', background: '#fff3cd', color: '#856404', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✏️</button>
                  <button onClick={() => deleteGlobalTimeSlot(zs.id)} style={{ width: 40, height: 40, border: 'none', background: '#ffe3e3', color: '#dc3545', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🗑️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit Modal */}
      {editingZs && (
        <EditModal title="Zeitslot bearbeiten" onClose={closeEdit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input value={zsForm.name} onChange={e => setZsForm({ ...zsForm, name: e.target.value })} placeholder="Name" style={{ padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Von</label><input type="time" value={zsForm.startTime} onChange={e => setZsForm({ ...zsForm, startTime: e.target.value })} style={{ width: '100%', padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} /></div>
              <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Bis</label><input type="time" value={zsForm.endTime} onChange={e => setZsForm({ ...zsForm, endTime: e.target.value })} style={{ width: '100%', padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Farbe</label><input type="color" value={zsForm.color} onChange={e => setZsForm({ ...zsForm, color: e.target.value })} style={{ width: '100%', height: 44, padding: 0, border: '1px solid #dee2e6', borderRadius: 8, cursor: 'pointer' }} /></div>
              <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Reihenfolge</label><input type="number" value={zsForm.order} onChange={e => setZsForm({ ...zsForm, order: parseInt(e.target.value) || 1 })} style={{ width: '100%', padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #e9ecef' }}>
              <button onClick={closeEdit} style={{ ...btnStyleSecondary, border: '1px solid #dee2e6', background: '#fff' }}>Abbrechen</button>
              <button onClick={saveGlobalTimeSlot} style={{ ...btnStyle, background: adminPrimary, color: '#fff', border: 'none' }}>💾 Speichern</button>
            </div>
          </div>
        </EditModal>
      )}
    </div>
  );
}
