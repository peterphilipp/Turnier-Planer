import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getYearGroups, apiPost, apiPatch, apiDelete } from '../../../api';
import { btnStyleSecondary, YearGroup, useSortableData, confirmWithImpact } from '../shared';
import EditModal from '../EditModal';

export default function Jahrgaenge({ adminPrimary }: { adminPrimary: string }) {
  const queryClient = useQueryClient();
  
  const { data: rawYearGroups, isLoading } = useQuery<YearGroup[]>({
    queryKey: ['yearGroups'],
    queryFn: getYearGroups
  });
  
  const yearGroups: YearGroup[] = (rawYearGroups && typeof rawYearGroups === 'object' && 'length' in rawYearGroups) ? rawYearGroups : [];
  const { items: sortedYearGroups, requestSort, getSortIndicator } = useSortableData(yearGroups, { key: 'order', direction: 'asc' });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', birthYearStart: 0, birthYearEnd: 0, order: 0, isActive: true });

  const save = async () => {
    if (!form.name || !form.birthYearStart || !form.birthYearEnd) return await modal.alert({ title: 'Hinweis', message: 'Alle Felder ausfüllen!' });
    if (form.birthYearStart < 1990 || form.birthYearStart > 2030) return await modal.alert({ title: 'Hinweis', message: 'Geburtsjahr von muss zwischen 1990 und 2030 liegen!' });
    if (form.birthYearEnd < 1990 || form.birthYearEnd > 2030) return await modal.alert({ title: 'Hinweis', message: 'Geburtsjahr bis muss zwischen 1990 und 2030 liegen!' });
    if (form.birthYearStart > form.birthYearEnd) return await modal.alert({ title: 'Hinweis', message: 'Geburtsjahr von darf nicht größer als Geburtsjahr bis sein!' });
    if (form.order < 0) return await modal.alert({ title: 'Hinweis', message: 'Reihenfolge darf nicht negativ sein!' });
    try {
      if (editingId) { await apiPatch(`/api/year-groups/${editingId}`, form); }
      else { await apiPost('/api/year-groups', form); }
      await queryClient.refetchQueries({ queryKey: ['yearGroups'] });
      setForm({ name: '', birthYearStart: 0, birthYearEnd: 0, order: 0, isActive: true });
      setEditingId(null);
    } catch (err: any) { await modal.alert({ title: 'Fehler', message: 'Fehler: ' + (err as Error).message }); }
  };

  const deleteItem = async (yg: YearGroup) => {
    if (!(await confirmWithImpact('yearGroup', yg.id, yg.name))) return;
    await apiDelete(`/api/year-groups/${yg.id}`);
    queryClient.invalidateQueries({ queryKey: ['yearGroups'] });
  };

  const openEdit = (yg: YearGroup) => { setEditingId(yg.id); setForm({ name: yg.name, birthYearStart: yg.birthYearStart, birthYearEnd: yg.birthYearEnd, order: yg.order, isActive: yg.isActive }); };
  const closeEdit = () => { setEditingId(null); setForm({ name: '', birthYearStart: 0, birthYearEnd: 0, order: 0, isActive: true }); };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>📅 Jahrgänge</h3>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>Definiere hier die Jahrgänge mit Geburtsjahr-Bereich.</p>

      {/* Neue YG Form */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch', marginBottom: 16 }}>
        <div style={{ flex: 2, minWidth: 250, display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📝 Name</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Jahrgang 2016" style={{ width: '100%', padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44, boxSizing: 'border-box' }} />
        </div>
        <div style={{ width: 90, display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📅 Von</label>
          <input type="number" value={form.birthYearStart || ''} onChange={e => setForm({ ...form, birthYearStart: parseInt(e.target.value) || 0 })} placeholder="–" style={{ width: '100%', padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44, boxSizing: 'border-box' }} />
        </div>
        <div style={{ width: 90, display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📅 Bis</label>
          <input type="number" value={form.birthYearEnd || ''} onChange={e => setForm({ ...form, birthYearEnd: parseInt(e.target.value) || 0 })} placeholder="–" style={{ width: '100%', padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44, boxSizing: 'border-box' }} />
        </div>
        <div style={{ width: 70, display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📊 Aktiv</label>
          <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ width: 20, height: 20, cursor: 'pointer', marginTop: 18 }} />
        </div>
        <button onClick={save} style={{ padding: '8px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, height: 44, minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15 }}>
          <span style={{ fontSize: 18, fontWeight: 'bold', lineHeight: 1 }} aria-hidden="true">+</span><span>Hinzufügen</span>
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '2px solid #e9ecef' }}><th style={{ width: 30, padding: '10px 4px', textAlign: 'center' }}>⋮⋮</th><th onClick={() => requestSort('name')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>Jahrgang{getSortIndicator('name')}</th><th onClick={() => requestSort('yearGroupRange')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right', cursor: 'pointer' }}>Geburtsjahr{getSortIndicator('yearGroupRange')}</th><th onClick={() => requestSort('isActive')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center', cursor: 'pointer' }}>Aktiv{getSortIndicator('isActive')}</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Aktion</th></tr></thead>
        <tbody>
          {isLoading || sortedYearGroups.length === 0 ? (
            <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#666' }}>Keine Jahrgänge vorhanden.</td></tr>
          ) : (
            sortedYearGroups.map((yg, idx) => (
              <tr key={yg.id} draggable onDragStart={() => {}} onDragEnter={() => {}} onDragEnd={() => {}} onDragOver={e => e.preventDefault()} style={{ borderBottom: '1px solid #f0f0f0', cursor: 'grab' }}>
                <td style={{ padding: '10px 4px', cursor: 'grab', color: '#ccc', textAlign: 'center' }}>⋮⋮</td>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{yg.name}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>{yg.birthYearStart} – {yg.birthYearEnd}</td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>{yg.isActive ? '✅' : '⏸️'}</td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEdit(yg)} style={{ width: 40, height: 40, border: 'none', background: '#fff3cd', color: '#856404', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✏️</button>
                    <button onClick={() => deleteItem(yg)} style={{ width: 40, height: 40, border: 'none', background: '#ffe3e3', color: '#dc3545', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Edit Modal */}
      {editingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '90%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>✏️ Jahrgang bearbeiten</h3>
              <button onClick={closeEdit} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#666' }}>×</button>
            </div>
            {/* Scrollbarer Inhalt */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📝 Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Jahrgang 2016" style={{ padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📅 Von</label><input type="number" value={form.birthYearStart || ''} onChange={e => setForm({ ...form, birthYearStart: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} /></div>
              <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📅 Bis</label><input type="number" value={form.birthYearEnd || ''} onChange={e => setForm({ ...form, birthYearEnd: parseInt(e.target.value) || 0 })} style={{ width: '100%', padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} /></div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Aktiv
            </label>
            </div>
            {/* Fixierter Footer – IMMER sichtbar (§13.2) */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #e9ecef', marginTop: 0, position: 'sticky', bottom: 0, background: '#fff' }}>
              <button onClick={closeEdit} style={{ ...btnStyleSecondary, border: '1px solid #dee2e6', background: '#fff' }}>Abbrechen</button>
              <button onClick={save} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>💾 Speichern</button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
