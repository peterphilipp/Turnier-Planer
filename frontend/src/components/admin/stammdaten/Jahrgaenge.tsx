import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getYearGroups, apiPost, apiPatch, apiDelete } from '../../../api';
import { btnStyleSecondary, YearGroup } from '../shared';
import EditModal from '../EditModal';

export default function Jahrgaenge({ adminPrimary }: { adminPrimary: string }) {
  const queryClient = useQueryClient();
  
  const { data: rawYearGroups, isLoading } = useQuery<YearGroup[]>({
    queryKey: ['yearGroups'],
    queryFn: getYearGroups
  });
  
  const yearGroups: YearGroup[] = (rawYearGroups && typeof rawYearGroups === 'object' && 'length' in rawYearGroups) ? rawYearGroups : [];
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', birthYearStart: 0, birthYearEnd: 0, order: 0, isActive: true });

  const save = async () => {
    if (!form.name || !form.birthYearStart || !form.birthYearEnd) return await modal.alert({ title: 'Hinweis', message: 'Alle Felder ausfüllen!' });
    try {
      if (editingId) { await apiPatch(`/api/year-groups/${editingId}`, form); }
      else { await apiPost('/api/year-groups', form); }
      await queryClient.refetchQueries({ queryKey: ['yearGroups'] });
      setForm({ name: '', birthYearStart: 0, birthYearEnd: 0, order: 0, isActive: true });
      setEditingId(null);
    } catch (err: any) { await modal.alert({ title: 'Fehler', message: 'Fehler: ' + (err as Error).message }); }
  };

  const deleteItem = async (id: number) => {
    if (!(await modal.confirm({ title: 'Jahrgang löschen', message: 'Möchtest du diesen Jahrgang wirklich löschen?', variant: 'danger' }))) return;
    await apiDelete(`/api/year-groups/${id}`);
    queryClient.invalidateQueries({ queryKey: ['yearGroups'] });
  };

  const openEdit = (yg: YearGroup) => { setEditingId(yg.id); setForm({ name: yg.name, birthYearStart: yg.birthYearStart, birthYearEnd: yg.birthYearEnd, order: yg.order, isActive: yg.isActive }); };
  const closeEdit = () => { setEditingId(null); setForm({ name: '', birthYearStart: 0, birthYearEnd: 0, order: 0, isActive: true }); };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>📅 Jahrgänge</h3>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>Definiere hier die Jahrgänge mit Geburtsjahr-Bereich.</p>

      {/* Neue YG Form */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Jahrgang 2016" style={{ flex: 1, minWidth: 200, padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
        <input type="number" value={form.birthYearStart || ''} onChange={e => setForm({ ...form, birthYearStart: parseInt(e.target.value) || 0 })} placeholder="Von" style={{ width: 90, padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
        <input type="number" value={form.birthYearEnd || ''} onChange={e => setForm({ ...form, birthYearEnd: parseInt(e.target.value) || 0 })} placeholder="Bis" style={{ width: 90, padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
        <input type="number" value={form.order || ''} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} placeholder="Reihenfolge" style={{ width: 90, padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Aktiv
        </label>
        <button onClick={save} style={{ padding: '14px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, minHeight: 44, minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15 }}>
          <span>➕</span><span>Hinzufügen</span>
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '2px solid #e9ecef' }}><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Jahrgang</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>Geburtsjahr</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Aktiv</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>Reihenfolge</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Aktion</th></tr></thead>
        <tbody>
          {isLoading || yearGroups.length === 0 ? (
            <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#666' }}>Keine Jahrgänge vorhanden.</td></tr>
          ) : (
            [...yearGroups].sort((a, b) => a.order - b.order).map(yg => (
              <tr key={yg.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{yg.name}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{yg.birthYearStart} – {yg.birthYearEnd}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>{yg.isActive ? '✅' : '⏸️'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{yg.order}</td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEdit(yg)} style={{ width: 40, height: 40, border: 'none', background: '#fff3cd', color: '#856404', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✏️</button>
                    <button onClick={() => deleteItem(yg.id)} style={{ width: 40, height: 40, border: 'none', background: '#ffe3e3', color: '#dc3545', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Edit Modal */}
      {editingId && (
        <EditModal title="Jahrgang bearbeiten" onClose={closeEdit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Jahrgang 2016" style={{ padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Geburtsjahr von</label><input type="number" value={form.birthYearStart || ''} onChange={e => setForm({ ...form, birthYearStart: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} /></div>
              <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Geburtsjahr bis</label><input type="number" value={form.birthYearEnd || ''} onChange={e => setForm({ ...form, birthYearEnd: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} /></div>
            </div>
            <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Reihenfolge</label><input type="number" value={form.order || ''} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Aktiv
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #e9ecef' }}>
              <button onClick={closeEdit} style={{ ...btnStyleSecondary, border: '1px solid #dee2e6', background: '#fff' }}>Abbrechen</button>
              <button onClick={save} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>💾 Speichern</button>
            </div>
          </div>
        </EditModal>
      )}
    </div>
  );
}
