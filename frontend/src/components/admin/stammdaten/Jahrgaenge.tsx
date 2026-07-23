import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getYearGroups, apiPost, apiPatch, apiDelete } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, YearGroup } from '../shared';

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
      let result;
      if (editingId) {
        result = await apiPatch(`/api/year-groups/${editingId}`, form);
      } else {
        result = await apiPost('/api/year-groups', form);
      }
      // Direkt neu laden
      await queryClient.refetchQueries({ queryKey: ['yearGroups'] });
      setForm({ name: '', birthYearStart: 0, birthYearEnd: 0, order: 0, isActive: true });
      setEditingId(null);
    } catch (err: any) {
      await modal.alert({ title: 'Fehler', message: 'Fehler: ' + (err as Error).message });
    }
  };

  const deleteItem = async (id: number) => {
    if (!(await modal.confirm({ title: 'Jahrgang löschen', message: 'Möchtest du diesen Jahrgang wirklich löschen?', variant: 'danger' }))) return;
    await apiDelete(`/api/year-groups/${id}`);
    queryClient.invalidateQueries({ queryKey: ['yearGroups'] });
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>Jahrgänge (Stammdaten)</h3>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>Definiere hier die Jahrgänge mit Geburtsjahr-Bereich. Diese werden für Lebensmittel-Slots und Helfer-Registrierung verwendet.</p>

      {/* Formular */}
      <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 12, marginBottom: 30, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 13 }}>Jahrgang-Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Jahrgang 2016" style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 13 }}>Geburtsjahr von</label>
            <input type="number" value={form.birthYearStart || ''} onChange={e => setForm({ ...form, birthYearStart: parseInt(e.target.value) || 0 })} placeholder="2016" style={{ ...inputStyle, width: 100 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 13 }}>Geburtsjahr bis</label>
            <input type="number" value={form.birthYearEnd || ''} onChange={e => setForm({ ...form, birthYearEnd: parseInt(e.target.value) || 0 })} placeholder="2017" style={{ ...inputStyle, width: 100 }} />
          </div>
          <button onClick={save} style={{ padding: '10px 24px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: 14 }}>
            {editingId ? '💾 Speichern' : '➕ Hinzufügen'}
          </button>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e9ecef', margin: '20px 0' }} />
      
      {/* Tabelle */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr>
            <th style={thStyle}>Jahrgang</th>
            <th style={thStyle}>Geburtsjahr</th>
            <th style={thStyle}>Aktiv</th>
            <th style={thStyle}>Reihenfolge</th>
            <th style={thStyle}>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {isLoading || yearGroups.length === 0 ? (
            <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#666' }}>Keine Jahrgänge vorhanden.</td></tr>
          ) : (
            [...yearGroups].sort((a, b) => a.order - b.order).map(yg => (
              <tr key={yg.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={tdStyle}>
                  {editingId === yg.id ? (
                    <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} style={{ ...inputStyle, width: 200 }} />
                  ) : (
                    <strong>{yg.name}</strong>
                  )}
                </td>
                <td style={tdStyle}>
                  {editingId === yg.id ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="number" value={form.birthYearStart || ''} onChange={e => setForm(prev => ({ ...prev, birthYearStart: parseInt(e.target.value) || 0 }))} style={{ ...inputStyle, width: 70 }} />
                      <span>–</span>
                      <input type="number" value={form.birthYearEnd || ''} onChange={e => setForm(prev => ({ ...prev, birthYearEnd: parseInt(e.target.value) || 0 }))} style={{ ...inputStyle, width: 70 }} />
                    </div>
                  ) : (
                    `${yg.birthYearStart} – ${yg.birthYearEnd}`
                  )}
                </td>
                <td style={tdStyle}>
                  {editingId === yg.id ? (
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))} />
                  ) : (
                    yg.isActive ? '✅' : '⏸️'
                  )}
                </td>
                <td style={tdStyle}>
                  {editingId === yg.id ? (
                    <input type="number" value={form.order || 0} onChange={e => setForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))} style={{ ...inputStyle, width: 60 }} />
                  ) : (
                    yg.order
                  )}
                </td>
                <td style={tdStyle}>
                  {editingId === yg.id ? (
                    <>
                      <button onClick={() => setEditingId(null)} style={{ ...btnStyle, background: '#d1e7dd', color: '#0f5132' }}>✓</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(yg.id); setForm({ name: yg.name, birthYearStart: yg.birthYearStart, birthYearEnd: yg.birthYearEnd, order: yg.order, isActive: yg.isActive }); }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404' }}>✏️</button>
                      <button onClick={() => deleteItem(yg.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545' }}>🗑️</button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
