import { useState, Fragment } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVolunteers, getYearGroups, apiPost, apiPatch, apiDelete } from '../../../api';
import { btnStyleSecondary, Volunteer, YearGroup, useSortableData, confirmWithImpact } from '../shared';
import EditModal from '../EditModal';
import { formatPhoneNumber } from '../../../utils/phone';

const ROLES = [
  { value: 'HELPER', label: '🔒 Helfer', colorClass: 'helfer-role-helper' },
  { value: 'ORGANIZER', label: '🔧 Organisator', colorClass: 'helfer-role-organizer' },
  { value: 'ADMIN', label: '👑 Admin', colorClass: 'helfer-role-admin' }
] as const;

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find(r => r.value === role) || ROLES[0];
  return (
    <span className={`helfer-role-badge ${r.colorClass}`}>
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
  // Aufklappbare Geräte-Detailansicht pro User (welche Geräte haben Push
  // aktiviert) - hilft bei der Fehlersuche, wenn ein Helfer mehrere Geräte
  // nutzt und nur auf einem Nachrichten ankommen.
  const [expandedPushId, setExpandedPushId] = useState<number | null>(null);

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
    <div className="helfer-container">
      <h2 className="helfer-title">👤 Benutzer & Personal</h2>
      <p className="helfer-subtitle">Alle registrierten Benutzer und zugewiesene Helfer</p>
      
      {/* Suchfeld */}
      <div className="helfer-search-container">
        <input 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="🔍 Suche nach Name oder E-Mail..." 
          className="helfer-search-input" 
        />
      </div>

      {/* Neue Helfer Form */}
      <div className="helfer-form-row">
        <div className="helfer-form-col-2">
          <label className="helfer-label">📝 Name</label>
          <input value={volForm.name} onChange={e => setVolForm({ ...volForm, name: e.target.value })} placeholder="Vor- und Nachname" className="helfer-input" />
        </div>
        <div className="helfer-form-col-1">
          <label className="helfer-label">📧 E-Mail</label>
          <input value={volForm.email} onChange={e => setVolForm({ ...volForm, email: e.target.value })} placeholder="email@beispiel.de" className="helfer-input" />
        </div>
      </div>
      <div className="helfer-form-row">
        <div className="helfer-form-col-fixed">
          <label className="helfer-label">📞 Telefon</label>
          <input value={volForm.phone} onChange={e => setVolForm({ ...volForm, phone: e.target.value })} onBlur={() => setVolForm({ ...volForm, phone: formatPhoneNumber(volForm.phone) || volForm.phone })} placeholder="+49 123 456789" className="helfer-input" />
        </div>
        <div className="helfer-form-col-fixed">
          <label className="helfer-label">🎭 Rolle</label>
          <select value={volForm.role} onChange={e => setVolForm({ ...volForm, role: e.target.value })} className="helfer-select">
            {ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
          </select>
        </div>
        <button onClick={saveVolunteer} className="helfer-btn-primary" style={{ background: adminPrimary }}>
          <span className="helfer-btn-primary-icon" aria-hidden="true">+</span><span>Hinzufügen</span>
        </button>
      </div>

      <table className="helfer-table">
        <thead>
          <tr className="helfer-table-header-row">
            <th onClick={() => requestSort('name')} className="helfer-table-th">Name{getSortIndicator('name')}</th>
            <th onClick={() => requestSort('email')} className="helfer-table-th">E-Mail{getSortIndicator('email')}</th>
            <th onClick={() => requestSort('phone')} className="helfer-table-th">Telefon{getSortIndicator('phone')}</th>
            <th onClick={() => requestSort('role')} className="helfer-table-th">Rolle{getSortIndicator('role')}</th>
            <th onClick={() => requestSort('lastActivityAt')} className="helfer-table-th">Letzte Aktivität{getSortIndicator('lastActivityAt')}</th>
            <th className="helfer-table-th-no-cursor">Aktion</th>
          </tr>
        </thead>
        <tbody>
          {sortedVolunteers.map(v => {
            const devices = v.pushSubscriptions || [];
            const isExpanded = expandedPushId === v.id;
            return (
            <Fragment key={v.id}>
            <tr className={`helfer-table-tr ${isExpanded ? 'helfer-table-tr-expanded' : ''}`}>
              <td className="helfer-table-td">
                {v.name}
                {(v.children || []).some(c => !matchingYearGroup(String(c.childYear))) && (
                  <span title="Mindestens ein Kind passt zu keinem Jahrgang - bitte prüfen" className="helfer-warning-icon">⚠️</span>
                )}
                {devices.length > 0 && (
                  <button
                    onClick={() => setExpandedPushId(isExpanded ? null : v.id)}
                    title={`Push-Benachrichtigungen aktiviert (${devices.length} Gerät${devices.length === 1 ? '' : 'e'}) - Details anzeigen`}
                    className="helfer-push-btn"
                  >
                    🔔 <span className="helfer-push-indicator">{isExpanded ? '▲' : '▼'}</span>
                  </button>
                )}
              </td>
              <td className="helfer-table-td-normal">{v.email || '–'}</td>
              <td className="helfer-table-td-normal">{v.phone || '–'}</td>
              <td className="helfer-table-td-normal">
                <div className="helfer-flex-row">
                  <RoleBadge role={v.role || 'HELPER'} />
                </div>
              </td>
              <td className={`helfer-table-td-normal helfer-date-text ${v.lastActivityAt ? 'helfer-date-active' : 'helfer-date-inactive'}`}>
                {v.lastActivityAt ? new Date(v.lastActivityAt).toLocaleDateString('de-DE') : 'Nie'}
              </td>
              <td className="helfer-table-td-actions">
                <div className="helfer-action-btns">
                  <button onClick={() => openEdit(v)} className="helfer-btn-edit">✏️</button>
                  <button onClick={async () => {
                    const result = await modal.form({ title: 'Passwort ändern', fields: [{ key: 'password', label: 'Neues Passwort', type: 'password' }] });
                    if (!result) return;
                    await apiPatch(`/api/volunteers/${v.id}/password`, { password: result?.password });
                    await modal.alert({ title: 'Erfolg', message: 'Passwort gesetzt!' });
                  }} className="helfer-btn-password" title="Passwort setzen">🔑</button>
                  <button onClick={() => deleteVolunteer(v)} className="helfer-btn-delete">🗑️</button>
                </div>
              </td>
            </tr>
            {isExpanded && (
              <tr className="helfer-table-tr">
                <td colSpan={6} className="helfer-expanded-td">
                  <div className="helfer-expanded-title">Geräte mit aktivierten Push-Benachrichtigungen:</div>
                  <div className="helfer-expanded-list">
                    {devices.map(d => (
                      <div key={d.id} className="helfer-expanded-item">
                        <span>📱</span>
                        <span className="helfer-device-label">{d.deviceLabel || 'Unbekanntes Gerät'}</span>
                        {d.createdAt && <span className="helfer-device-date">· seit {new Date(d.createdAt).toLocaleDateString('de-DE')}</span>}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            )}
            </Fragment>
            );
          })}
          {volunteers.length === 0 ? (
            <tr><td colSpan={6} className="helfer-empty-td">Keine Benutzer vorhanden.</td></tr>
          ) : (filtered.length === 0 ? <tr><td colSpan={6} className="helfer-empty-td">Keine Treffer für "{search}"</td></tr> : null)}
        </tbody>
      </table>

      {/* Edit Modal */}
      {editingVol && (
        <div className="helfer-modal-overlay">
          <div className="helfer-modal-content">
            <div className="helfer-modal-header">
              <h3 className="helfer-modal-title">✏️ Helfer bearbeiten</h3>
              <button onClick={closeEdit} className="helfer-modal-close">×</button>
            </div>
            {/* Scrollbarer Inhalt */}
            <div className="helfer-modal-body">
              <div className="helfer-modal-form">
                <div>
                  <label className="helfer-label">📝 Name</label>
                  <input value={volForm.name} onChange={e => setVolForm({ ...volForm, name: e.target.value })} placeholder="Vor- und Nachname" className="helfer-modal-input" />
                </div>
                <div>
                  <label className="helfer-label">📧 E-Mail</label>
                  <input value={volForm.email} onChange={e => setVolForm({ ...volForm, email: e.target.value })} placeholder="email@beispiel.de" className="helfer-modal-input" />
                </div>
                <div>
                  <label className="helfer-label">📞 Telefon</label>
                  <input value={volForm.phone} onChange={e => setVolForm({ ...volForm, phone: e.target.value })} onBlur={() => setVolForm({ ...volForm, phone: formatPhoneNumber(volForm.phone) || volForm.phone })} placeholder="+49 123 456789" className="helfer-modal-input" />
                </div>
            
            <div><label className="helfer-label">🎭 Rolle</label>
              <select value={volForm.role} onChange={e => setVolForm({ ...volForm, role: e.target.value })} className="helfer-modal-select">
                {ROLES.map(r => (<option key={r.value} value={r.value}>{r.label}</option>))}
              </select>
            </div>

            {/* Kinder: bei der Registrierung vom Nutzer selbst eingetragen, hier
                korrigierbar - der Jahrgang ergibt sich rein aus dem Geburtsjahr
                (kein eigenes Zuordnungsfeld), ein Zahlendreher landet den
                Helfer sonst beim falschen Jahrgang oder bei gar keinem. */}
            <div>
              <label className="helfer-label">👶 Kinder</label>
              <div className="helfer-children-container">
                {volForm.children.map((c, idx) => {
                  const yg = matchingYearGroup(c.childYear);
                  return (
                    <div key={idx}>
                      <div className="helfer-child-row">
                        <input
                          value={c.childName}
                          onChange={e => setVolForm({ ...volForm, children: volForm.children.map((x, i) => i === idx ? { ...x, childName: e.target.value } : x) })}
                          placeholder="Name des Kindes"
                          className="helfer-child-name"
                        />
                        <input
                          value={c.childYear}
                          onChange={e => setVolForm({ ...volForm, children: volForm.children.map((x, i) => i === idx ? { ...x, childYear: e.target.value } : x) })}
                          placeholder="Jg."
                          type="number"
                          className="helfer-child-year"
                        />
                        <button
                          type="button"
                          onClick={() => setVolForm({ ...volForm, children: volForm.children.filter((_, i) => i !== idx) })}
                          className="helfer-child-remove"
                        >×</button>
                      </div>
                      {c.childYear.trim() && (
                        <div className={`helfer-child-status ${yg ? 'helfer-child-status-ok' : 'helfer-child-status-err'}`}>
                          {yg ? `✓ Jahrgang: ${yg.name}` : '⚠️ Kein Jahrgang gefunden für dieses Geburtsjahr'}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setVolForm({ ...volForm, children: [...volForm.children, { childName: '', childYear: '' }] })}
                  className="helfer-child-add"
                >➕ Kind hinzufügen</button>
              </div>
            </div>

            </div>
            {/* Fixierter Footer – IMMER sichtbar (§13.2) */}
            <div className="helfer-modal-footer">
              <button onClick={closeEdit} style={btnStyleSecondary} className="helfer-btn-cancel">Abbrechen</button>
              <button onClick={saveVolunteer} className="helfer-btn-save" style={{ background: adminPrimary }}>💾 Speichern</button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
