import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVolunteers, getYearGroups, apiPost, apiPatch, apiDelete } from '../../../api';
import { btnStyleSecondary, Volunteer, YearGroup, useSortableData, confirmWithImpact } from '../shared';
import EditModal from '../EditModal';
import { formatPhoneNumber } from '../../../utils/phone';

const ROLES = [
  { value: 'HELPER', label: '🔒 Helfer', color: '#6c757d', bg: '#f8f9fa' },
  { value: 'ORGANIZER', label: '🔧 Organisator', color: '#0d6efd', bg: '#e8f4fd' },
  { value: 'ADMIN', label: '👑 Admin', color: '#dc3545', bg: '#fce8e8' }
] as const;

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find(r => r.value === role) || ROLES[0];
  return (
    <span style={{ display: 'inline-block', padding: '4px 12px', background: r.bg, color: r.color, borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
      {r.label}
    </span>
  );
}

export default function Helfer({ adminPrimary, tournamentId }: { adminPrimary: string, tournamentId: number | null }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  // Fetch ALL users unconditionally for the user management view
  const { data: volunteers = [] } = useQuery<Volunteer[]>({ queryKey: ['volunteers'], queryFn: () => getVolunteers() });
  const { data: yearGroups = [] } = useQuery<YearGroup[]>({ queryKey: ['yearGroups'], queryFn: getYearGroups });

  const [volForm, setVolForm] = useState<{ name: string; email: string; phone: string; role: string; children: { childName: string; childYear: string }[] }>({ name: '', email: '', phone: '', role: 'HELPER', children: [] });
  const [editingVol, setEditingVol] = useState<number | null>(null);

  /** Jahrgang, dem ein Geburtsjahr zugeordnet würde - rein über den Bereichs-Abgleich, es gibt kein eigenes Zuordnungsfeld. */
  const matchingYearGroup = (childYear: string) => {
    const y = parseInt(childYear);
    if (!y) return null;
    return yearGroups.find(yg => y >= yg.birthYearStart && y <= yg.birthYearEnd) || null;
  };

  const filtered = volunteers.filter(v => 
    !search || v.name.toLowerCase().includes(search.toLowerCase()) || (v.email || '').toLowerCase().includes(search.toLowerCase())
  );
  
  const { items: sortedVolunteers, requestSort, getSortIndicator } = useSortableData(filtered, { key: 'name', direction: 'asc' });

  const EMPTY_FORM = { name: '', email: '', phone: '', role: 'HELPER', children: [] as { childName: string; childYear: string }[] };

  const saveVolunteer = async () => {
    if (!volForm.name.trim()) return await modal.alert({ title: 'Hinweis', message: 'Name erforderlich!' });
    if (volForm.name.trim().length > 100) return await modal.alert({ title: 'Hinweis', message: 'Name darf maximal 100 Zeichen lang sein!' });
    if (volForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(volForm.email.trim())) return await modal.alert({ title: 'Hinweis', message: 'Bitte eine gültige E-Mail-Adresse eingeben!' });
    for (const c of volForm.children) {
      if (!c.childName.trim() && !c.childYear.trim()) continue; // komplett leere Zeile wird beim Speichern ignoriert
      if (!c.childName.trim() || !c.childYear.trim()) return await modal.alert({ title: 'Hinweis', message: 'Bei einem Kind fehlt der Name oder das Geburtsjahr - bitte beides ausfüllen oder die Zeile entfernen.' });
      const y = parseInt(c.childYear);
      if (isNaN(y) || y < 1990 || y > 2030) return await modal.alert({ title: 'Hinweis', message: 'Geburtsjahr eines Kindes muss zwischen 1990 und 2030 liegen.' });
    }
    const payload = {
      ...volForm,
      children: volForm.children
        .filter(c => c.childName.trim() && c.childYear.trim())
        .map(c => ({ childName: c.childName.trim(), childYear: parseInt(c.childYear) }))
    };
    if (editingVol) {
      await apiPatch(`/api/volunteers/${editingVol}`, payload);
    } else {
      await apiPost('/api/volunteers', payload);
    }
    queryClient.invalidateQueries({ queryKey: ['volunteers'] });
    setVolForm(EMPTY_FORM);
    setEditingVol(null);
  };

  const deleteVolunteer = async (v: Volunteer) => {
    if (!(await confirmWithImpact('volunteer', v.id, v.name))) return;
    await apiDelete(`/api/volunteers/${v.id}`);
    queryClient.invalidateQueries({ queryKey: ['volunteers'] });
  };

  const openEdit = (v: Volunteer) => {
    setEditingVol(v.id);
    setVolForm({
      name: v.name, email: v.email || '', phone: v.phone || '', role: v.role || 'HELPER',
      children: (v.children || []).map(c => ({ childName: c.childName, childYear: String(c.childYear) }))
    });
  };
  const closeEdit = () => { setEditingVol(null); setVolForm(EMPTY_FORM); };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 'bold' }}>👤 Benutzer & Personal</h2>
      <p style={{ margin: 0, color: '#666', marginBottom: 24 }}>Alle registrierten Benutzer und zugewiesene Helfer</p>
      
      {/* Suchfeld */}
      <div style={{ marginBottom: 16 }}>
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="🔍 Suche nach Name oder E-Mail..." 
          style={{ width: '100%', maxWidth: 400, padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} 
        />
      </div>

      {/* Neue Helfer Form */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={volForm.name} onChange={e => setVolForm({ ...volForm, name: e.target.value })} placeholder="Name" style={{ flex: 1, minWidth: 200, padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
        <input value={volForm.email} onChange={e => setVolForm({ ...volForm, email: e.target.value })} placeholder="E-Mail" style={{ flex: 1, minWidth: 200, padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
        <input value={volForm.phone} onChange={e => setVolForm({ ...volForm, phone: e.target.value })} onBlur={() => setVolForm({ ...volForm, phone: formatPhoneNumber(volForm.phone) || volForm.phone })} placeholder="Telefon" style={{ width: 160, padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
        <select value={volForm.role} onChange={e => setVolForm({ ...volForm, role: e.target.value })} style={{ width: 160, padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }}>
          {ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
        </select>
        <button onClick={saveVolunteer} style={{ padding: '14px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, minHeight: 44, minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15 }}>
          <span>➕</span><span>Hinzufügen</span>
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e9ecef' }}>
            <th onClick={() => requestSort('name')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>Name{getSortIndicator('name')}</th>
            <th onClick={() => requestSort('email')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>E-Mail{getSortIndicator('email')}</th>
            <th onClick={() => requestSort('phone')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>Telefon{getSortIndicator('phone')}</th>
            <th onClick={() => requestSort('role')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>Rolle{getSortIndicator('role')}</th>
            <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {sortedVolunteers.map(v => (
            <tr key={v.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                {v.name}
                {(v.children || []).some(c => !matchingYearGroup(String(c.childYear))) && (
                  <span title="Mindestens ein Kind passt zu keinem Jahrgang - bitte prüfen" style={{ marginLeft: 6, fontSize: 13 }}>⚠️</span>
                )}
                {(v.pushSubscriptions?.length ?? 0) > 0 && (
                  <span title="Push-Benachrichtigungen aktiviert" style={{ marginLeft: 6, fontSize: 13 }}>🔔</span>
                )}
              </td>
              <td style={{ padding: '10px 12px' }}>{v.email || '–'}</td>
              <td style={{ padding: '10px 12px' }}>{v.phone || '–'}</td>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <RoleBadge role={v.role || 'HELPER'} />
                </div>
              </td>
              <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEdit(v)} style={{ width: 40, height: 40, border: 'none', background: '#fff3cd', color: '#856404', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✏️</button>
                  <button onClick={async () => {
                    const result = await modal.form({ title: 'Passwort ändern', fields: [{ key: 'password', label: 'Neues Passwort', type: 'password' }] });
                    if (!result) return;
                    await apiPatch(`/api/volunteers/${v.id}/password`, { password: result?.password });
                    await modal.alert({ title: 'Erfolg', message: 'Passwort gesetzt!' });
                  }} style={{ width: 40, height: 40, border: 'none', background: '#e9ecef', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }} title="Passwort setzen">🔑</button>
                  <button onClick={() => deleteVolunteer(v)} style={{ width: 40, height: 40, border: 'none', background: '#ffe3e3', color: '#dc3545', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🗑️</button>
                </div>
              </td>
            </tr>
          ))}
          {volunteers.length === 0 ? (
            <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#666' }}>Keine Benutzer vorhanden.</td></tr>
          ) : (filtered.length === 0 ? <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#666' }}>Keine Treffer für "{search}"</td></tr> : null)}
        </tbody>
      </table>

      {/* Edit Modal */}
      {editingVol && (
        <EditModal title="Helfer bearbeiten" onClose={closeEdit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input value={volForm.name} onChange={e => setVolForm({ ...volForm, name: e.target.value })} placeholder="Name" style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} />
            <input value={volForm.email} onChange={e => setVolForm({ ...volForm, email: e.target.value })} placeholder="E-Mail" style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} />
            <input value={volForm.phone} onChange={e => setVolForm({ ...volForm, phone: e.target.value })} onBlur={() => setVolForm({ ...volForm, phone: formatPhoneNumber(volForm.phone) || volForm.phone })} placeholder="Telefon" style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} />
            
            <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Rolle</label>
              <select value={volForm.role} onChange={e => setVolForm({ ...volForm, role: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }}>
                {ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
              </select>
            </div>

            {/* Kinder: bei der Registrierung vom Nutzer selbst eingetragen, hier
                korrigierbar - der Jahrgang ergibt sich rein aus dem Geburtsjahr
                (kein eigenes Zuordnungsfeld), ein Zahlendreher landet den
                Helfer sonst beim falschen Jahrgang oder bei gar keinem. */}
            <div>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Kinder</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
                {volForm.children.map((c, idx) => {
                  const yg = matchingYearGroup(c.childYear);
                  return (
                    <div key={idx}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          value={c.childName}
                          onChange={e => setVolForm({ ...volForm, children: volForm.children.map((x, i) => i === idx ? { ...x, childName: e.target.value } : x) })}
                          placeholder="Name des Kindes"
                          style={{ flex: 1, padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }}
                        />
                        <input
                          value={c.childYear}
                          onChange={e => setVolForm({ ...volForm, children: volForm.children.map((x, i) => i === idx ? { ...x, childYear: e.target.value } : x) })}
                          placeholder="Jg."
                          type="number"
                          style={{ width: 90, padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }}
                        />
                        <button
                          type="button"
                          onClick={() => setVolForm({ ...volForm, children: volForm.children.filter((_, i) => i !== idx) })}
                          style={{ width: 40, border: 'none', background: '#ffe3e3', color: '#dc3545', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}
                        >×</button>
                      </div>
                      {c.childYear.trim() && (
                        <div style={{ fontSize: 12, marginTop: 4, color: yg ? '#198754' : '#dc3545' }}>
                          {yg ? `✓ Jahrgang: ${yg.name}` : '⚠️ Kein Jahrgang gefunden für dieses Geburtsjahr'}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setVolForm({ ...volForm, children: [...volForm.children, { childName: '', childYear: '' }] })}
                  style={{ padding: '8px 12px', background: '#f8f9fa', border: '1px dashed #adb5bd', color: '#495057', borderRadius: 8, cursor: 'pointer', fontSize: 14, alignSelf: 'flex-start' }}
                >➕ Kind hinzufügen</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #e9ecef' }}>
              <button onClick={closeEdit} style={{ ...btnStyleSecondary, border: '1px solid #dee2e6', background: '#fff' }}>Abbrechen</button>
              <button onClick={saveVolunteer} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>💾 Speichern</button>
            </div>
          </div>
        </EditModal>
      )}
    </div>
  );
}
