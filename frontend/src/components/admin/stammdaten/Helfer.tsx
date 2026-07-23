import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVolunteers, apiPost, apiPatch, apiDelete } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, Volunteer } from '../shared';

export default function Helfer({ adminPrimary, tournamentId }: { adminPrimary: string, tournamentId: number | null }) {
  const queryClient = useQueryClient();
  const { data: volunteers = [] } = useQuery<Volunteer[]>({ queryKey: ['volunteers', tournamentId], queryFn: () => getVolunteers(tournamentId), enabled: !!tournamentId });
  
  const [volForm, setVolForm] = useState({ name: '', email: '', phone: '' });
  const [editingVol, setEditingVol] = useState<number | null>(null);

  const saveVolunteer = async () => {
    if (!volForm.name.trim()) return await modal.alert({ title: 'Hinweis', message: 'Name erforderlich!' });
    if (editingVol) {
      await apiPatch(`/api/volunteers/${editingVol}`, { ...volForm, roles: ['Helfer'] });
    } else {
      await apiPost('/api/volunteers', { ...volForm, roles: ['Helfer'] });
    }
    queryClient.invalidateQueries({ queryKey: ['volunteers'] });
    setVolForm({ name: '', email: '', phone: '' });
    setEditingVol(null);
  };

  const deleteVolunteer = async (id: number) => {
    if (!(await modal.confirm({ title: 'Helfer löschen', message: 'Helfer löschen? Alle Einsätze werden entfernt.', variant: 'danger' }))) return;
    await apiDelete(`/api/volunteers/${id}`);
    queryClient.invalidateQueries({ queryKey: ['volunteers'] });
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>👷 Helfer & Personal</h3>
      
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={volForm.name} onChange={e => setVolForm({ ...volForm, name: e.target.value })} placeholder="Name" style={{ ...inputStyle, width: 200 }} />
        <input value={volForm.email} onChange={e => setVolForm({ ...volForm, email: e.target.value })} placeholder="E-Mail" style={{ ...inputStyle, width: 200 }} />
        <input value={volForm.phone} onChange={e => setVolForm({ ...volForm, phone: e.target.value })} placeholder="Telefon" style={{ ...inputStyle, width: 150 }} />
        
        <button onClick={saveVolunteer} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          {editingVol ? '💾 Speichern' : '➕ Hinzufügen'}
        </button>
        {editingVol && <button onClick={() => { setEditingVol(null); setVolForm({ name: '', email: '', phone: '' }); }} style={{ ...btnStyle, background: '#e9ecef' }}>Abbrechen</button>}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>E-Mail</th>
            <th style={thStyle}>Telefon</th>
            <th style={thStyle}>Rollen</th>
            <th style={thStyle}>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {volunteers.map(v => (
            <tr key={v.id}>
              <td style={tdStyle}>{v.name}</td>
              <td style={tdStyle}>{v.email || '–'}</td>
              <td style={tdStyle}>{v.phone || '–'}</td>
              <td style={tdStyle}>{v.roles.join(', ')}</td>
              <td style={tdStyle}>
                <button onClick={() => { setEditingVol(v.id); setVolForm({ name: v.name, email: v.email || '', phone: v.phone || '' }); }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', border: 'none', marginRight: 6 }}>✏️</button>
                <button onClick={async () => {
                  const result = await modal.form({ title: 'Passwort ändern', fields: [{ key: 'password', label: 'Neues Passwort', type: 'password' }] });
                  if (!result) return;
                  const newPassword = result?.password;
                  if (!newPassword) return;
                  await apiPatch(`/api/volunteers/${v.id}/password`, { password: newPassword });
                  await modal.alert({ title: 'Erfolg', message: 'Passwort gesetzt!' });
                }} style={{ ...btnStyle, background: '#e9ecef', border: 'none', marginRight: 6 }} title="Passwort setzen">🔑</button>
                <button onClick={() => deleteVolunteer(v.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}>🗑️</button>
              </td>
            </tr>
          ))}
          {volunteers.length === 0 && <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#666', padding: 24 }}>Keine Helfer vorhanden.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
