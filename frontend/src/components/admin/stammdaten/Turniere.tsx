import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTournaments, getClubs, getYearGroups, apiPost, apiPatch, apiDelete } from '../../../api';
import { btnStyleSecondary, Tournament, Club, YearGroup, useSortableData, confirmWithImpact } from '../shared';
import EditModal from '../EditModal';

export default function Turniere({ adminPrimary, adminSecondary }: { adminPrimary: string, adminSecondary: string }) {
  const queryClient = useQueryClient();
  const { data: tournaments = [] } = useQuery<Tournament[]>({ queryKey: ['tournaments'], queryFn: getTournaments });
  const { data: clubs = [] } = useQuery<Club[]>({ queryKey: ['clubs'], queryFn: getClubs });
  const { data: yearGroups = [] } = useQuery<YearGroup[]>({ queryKey: ['yearGroups'], queryFn: getYearGroups });
  
  const { items: sortedTournaments, requestSort, getSortIndicator } = useSortableData(tournaments, { key: 'startDate', direction: 'desc' });

  const [statusDialog, setStatusDialog] = useState({ open: false, tournament: null as Tournament | null, editName: '', editClubId: '', editStart: '', editEnd: '', editStatus: '', yearGroupIds: [] as number[], logoFile: null as File | null, editHasSponsor: false, editSponsorName: '', editSponsorUrl: '' });

  const [newTourn, setNewTourn] = useState({ name: '', start: '', end: '', clubId: '', isActive: true });
  const [isEndTouched, setIsEndTouched] = useState(false);

  // Keine Datumswerte in der Vergangenheit anbieten (Von/Bis).
  const todayStr = new Date().toISOString().split('T')[0];

  const closeStatusDialog = () => setStatusDialog({ open: false, tournament: null, editName: '', editClubId: '', editStart: '', editEnd: '', editStatus: '', yearGroupIds: [], logoFile: null, editHasSponsor: false, editSponsorName: '', editSponsorUrl: '' });

  const saveTournamentEdit = async () => {
    if (!statusDialog.tournament) return;
    if (!statusDialog.editName.trim()) return await modal.alert({ title: 'Hinweis', message: 'Name erforderlich!' });
    if (statusDialog.editStart && statusDialog.editEnd && statusDialog.editStart > statusDialog.editEnd) return await modal.alert({ title: 'Hinweis', message: 'Startdatum darf nicht nach dem Enddatum liegen!' });
    if (statusDialog.editHasSponsor && !statusDialog.editSponsorName.trim()) return await modal.alert({ title: 'Hinweis', message: 'Sponsor-Name erforderlich!' });
    const patchData: any = {
      name: statusDialog.editName, startDate: statusDialog.editStart, endDate: statusDialog.editEnd,
      status: statusDialog.editStatus,
      clubId: statusDialog.editClubId && statusDialog.editClubId !== '' ? parseInt(statusDialog.editClubId) : null,
      yearGroupIds: statusDialog.yearGroupIds,
      hasSponsor: statusDialog.editHasSponsor,
      sponsorName: statusDialog.editSponsorName || null,
      sponsorUrl: statusDialog.editSponsorUrl || null
    };

    // Logo-Upload wenn vorhanden (als Base64)
    if (statusDialog.logoFile) {
      patchData.logo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(statusDialog.logoFile!);
      });
    }

    await apiPatch(`/api/tournaments/${statusDialog.tournament.id}`, patchData);
    queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    closeStatusDialog();
  };

  const handleNewStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = e.target.value;
    setNewTourn(prev => ({
      ...prev,
      start,
      end: !isEndTouched ? start : prev.end
    }));
  };

  const handleNewEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsEndTouched(true);
    setNewTourn(prev => ({ ...prev, end: e.target.value }));
  };

  const createTournament = async () => {
    const { name, start, end, clubId } = newTourn;
    if (!name || !start || !end) return await modal.alert({ title: 'Hinweis', message: 'Name, Start- und Enddatum erforderlich!' });
    if (start > end) return await modal.alert({ title: 'Hinweis', message: 'Startdatum darf nicht nach dem Enddatum liegen!' });
    await apiPost('/api/tournaments', {
      name,
      startDate: start,
      endDate: end,
      status: newTourn.isActive ? 'aktiv' : 'entwurf',
      clubId: clubId ? parseInt(clubId) : null,
      // turnierModus bewusst nicht gesetzt (Backend-Default GRUPPEN_KO greift) -
      // der Modus wird jetzt ausschließlich über den "Modus"-Tab im
      // Spielplanmanagement gepflegt, nicht mehr bei der Turnier-Anlage.
      yearGroupIds: []
    });
    queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    setNewTourn({ name: '', start: '', end: '', clubId: '', isActive: true });
    setIsEndTouched(false);
  };

  const deleteTournament = async (t: Tournament) => {
    if (!(await confirmWithImpact('tournament', t.id, t.name))) return;
    await apiDelete(`/api/tournaments/${t.id}`);
    queryClient.invalidateQueries({ queryKey: ['tournaments'] });
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = { aktiv: { bg: '#d1e7dd', color: '#0f5132' }, entwurf: { bg: '#e9ecef', color: '#495057' }, archiviert: { bg: '#f8f9fa', color: '#495057' } };
    const c = colors[status] || colors.aktiv;
    return <span style={{ padding: '4px 12px', background: c.bg, color: c.color, borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{status}</span>;
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>🏆 Turnier-Verwaltung</h3>
      
      {/* Neue Turnier Form */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch', marginBottom: 16 }}>
        <div style={{ flex: 2, minWidth: 250, display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📝 Name</label>
          <input value={newTourn.name} onChange={e => setNewTourn(prev => ({...prev, name: e.target.value}))} placeholder="z.B. Sommerturnier" style={{ width: '100%', padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44, boxSizing: 'border-box' }} />
        </div>
        <div style={{ width: 150, display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📅 Von</label>
          <input type="date" value={newTourn.start} min={todayStr} max={newTourn.end || undefined} onChange={handleNewStartChange} style={{ width: '100%', padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44, boxSizing: 'border-box' }} />
        </div>
        <div style={{ width: 150, display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📅 Bis</label>
          <input type="date" value={newTourn.end} min={newTourn.start || todayStr} onChange={handleNewEndChange} style={{ width: '100%', padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44, boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>🏅 Verein</label>
          <select value={newTourn.clubId} onChange={e => setNewTourn(prev => ({...prev, clubId: e.target.value}))} style={{ width: '100%', padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }}>
            <option value="">-- Kein Verein --</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ width: 70, display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📊 Aktiv</label>
          <input type="checkbox" id="newTournActive" checked={newTourn.isActive} onChange={e => setNewTourn(prev => ({...prev, isActive: e.target.checked}))} style={{ width: 20, height: 20, cursor: 'pointer' }} />
        </div>
        <button onClick={createTournament} style={{ padding: '8px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, height: 44, minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15 }}>
          <span style={{ fontSize: 18, fontWeight: 'bold', lineHeight: 1 }} aria-hidden="true">+</span><span>Hinzufügen</span>
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '2px solid #e9ecef' }}><th onClick={() => requestSort('clubName')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>Verein{getSortIndicator('clubName')}</th><th onClick={() => requestSort('name')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>Name{getSortIndicator('name')}</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Sponsor-Logo</th><th onClick={() => requestSort('startDate')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right', cursor: 'pointer' }}>Von{getSortIndicator('startDate')}</th><th onClick={() => requestSort('endDate')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right', cursor: 'pointer' }}>Bis{getSortIndicator('endDate')}</th><th onClick={() => requestSort('statusBadge')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center', cursor: 'pointer' }}>Status{getSortIndicator('statusBadge')}</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Jahrgänge</th></tr></thead>
        <tbody>
          {sortedTournaments.map(t => (
            <tr key={t.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '10px 12px' }}>
                {t.club ? (<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {t.club.logo ? <img src={t.club.logo} alt={t.club.name} style={{ width: 28, height: 28, borderRadius: 8 }} /> : <span style={{ width: 28, height: 28, borderRadius: 8, background: t.club.primaryColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>{t.club.name.charAt(0)}</span>}
                  <span style={{ fontSize: 12 }}>{t.club.name}</span>
                </span>) : <span style={{ color: '#999' }}>–</span>}
              </td>
              <td style={{ padding: '10px 12px', fontWeight: 500 }}>{t.name}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                {t.logo ? (
                  <img src={t.logo} alt="Sponsor" style={{ maxWidth: 120, maxHeight: 35, objectFit: 'contain', borderRadius: 4 }} />
                ) : (
                  <span style={{ color: '#999', fontSize: 12 }}>–</span>
                )}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{new Date(t.startDate).toLocaleDateString('de-DE')}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>{new Date(t.endDate).toLocaleDateString('de-DE')}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center' }}>{statusBadge(t.status)}</td>
              <td style={{ padding: '10px 12px' }}>
                {t.yearGroups && t.yearGroups.length > 0 ? (<div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{t.yearGroups.map(yg => (<span key={yg.id} style={{ fontSize: 11, background: '#e7f3ff', color: '#0d6efd', padding: '2px 6px', borderRadius: 4 }}>{yg.name}</span>))}</div>) : <span style={{ color: '#999' }}>–</span>}
              </td>
              <td style={{ padding: '8px 12px' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setStatusDialog({ open: true, tournament: t, editName: t.name, editClubId: String(t.clubId || ''), editStart: t.startDate.split('T')[0], editEnd: t.endDate.split('T')[0], editStatus: (t.status || 'aktiv').toLowerCase(), yearGroupIds: t.yearGroups?.map(yg => yg.id) || [], logoFile: null, editHasSponsor: t.hasSponsor || false, editSponsorName: t.sponsorName || '', editSponsorUrl: t.sponsorUrl || '' })} style={{ width: 40, height: 40, border: 'none', background: '#fff3cd', color: '#856404', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✏️</button>
                  <button onClick={() => deleteTournament(t)} style={{ width: 40, height: 40, border: 'none', background: '#ffe3e3', color: '#dc3545', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🗑️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit Modal */}
      {statusDialog.open && statusDialog.tournament && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '90%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>✏️ Turnier bearbeiten</h3>
              <button onClick={closeStatusDialog} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#666' }}>×</button>
            </div>
            {/* Scrollbarer Inhalt */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📝 Name</label>
              <input value={statusDialog.editName} onChange={e => setStatusDialog({ ...statusDialog, editName: e.target.value })} placeholder="z.B. Sommerturnier 2025" style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📅 Zeitraum</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input type="date" value={statusDialog.editStart} min={todayStr} max={statusDialog.editEnd || undefined} onChange={e => setStatusDialog({ ...statusDialog, editStart: e.target.value })} style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} />
                <input type="date" value={statusDialog.editEnd} min={statusDialog.editStart || todayStr} onChange={e => setStatusDialog({ ...statusDialog, editEnd: e.target.value })} style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} />
              </div>
            </div>
            <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>🏅 Verein</label>
              <select value={statusDialog.editClubId} onChange={e => setStatusDialog({ ...statusDialog, editClubId: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }}>
                <option value="">-- Kein Verein --</option>
                {clubs.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </div>

              {/* Sponsor Section */}
              <div style={{ marginTop: 8, padding: 12, border: '1px solid #dee2e6', borderRadius: 8, background: '#f8f9fa' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold', fontSize: 13, cursor: 'pointer', marginBottom: statusDialog.editHasSponsor ? 12 : 0 }}>
                  <input type="checkbox" checked={statusDialog.editHasSponsor} onChange={e => setStatusDialog({ ...statusDialog, editHasSponsor: e.target.checked })} style={{ width: 16, height: 16 }} />
                  🤝 Hat Sponsor?
                </label>
                {statusDialog.editHasSponsor && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>🤝 Sponsor Name</label>
                      <input value={statusDialog.editSponsorName} onChange={e => setStatusDialog({ ...statusDialog, editSponsorName: e.target.value })} placeholder="Name des Sponsors" style={{ width: '100%', padding: '8px 10px', border: '1px solid #dee2e6', borderRadius: 6, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>🔗 Sponsor URL</label>
                      <input value={statusDialog.editSponsorUrl} onChange={e => setStatusDialog({ ...statusDialog, editSponsorUrl: e.target.value })} placeholder="https://www.sponsor.de" style={{ width: '100%', padding: '8px 10px', border: '1px solid #dee2e6', borderRadius: 6, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>🖼️ Sponsor-Logo</label>
                      {statusDialog.tournament?.logo && (
                        <div><img src={statusDialog.tournament.logo} alt="Aktuelles Logo" style={{ maxWidth: 200, maxHeight: 60, objectFit: 'contain', borderRadius: 4, margin: '8px 0' }} /></div>
                      )}
                      <input type="file" accept="image/*" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) setStatusDialog({ ...statusDialog, logoFile: file });
                      }} style={{ fontSize: 12, marginTop: 4 }} />
                    </div>
                  </div>
                )}
              </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📅 Jahrgänge</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setStatusDialog({ ...statusDialog, yearGroupIds: yearGroups.filter(yg => yg.isActive).map(yg => yg.id) })} style={{ fontSize: 11, padding: '3px 8px', border: '1px solid #dee2e6', background: '#fff', borderRadius: 4, cursor: 'pointer' }}>Alle</button>
                  <button onClick={() => setStatusDialog({ ...statusDialog, yearGroupIds: [] })} style={{ fontSize: 11, padding: '3px 8px', border: '1px solid #dee2e6', background: '#fff', borderRadius: 4, cursor: 'pointer' }}>Keine</button>
                </div>
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: 8 }}>
                {yearGroups.filter(yg => yg.isActive).map(yg => (
                  <label key={yg.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', background: statusDialog.yearGroupIds.includes(yg.id) ? '#e8f4fd' : 'transparent' }}>
                    <input type="checkbox" checked={statusDialog.yearGroupIds.includes(yg.id)} onChange={() => {
                      const ids = statusDialog.yearGroupIds.includes(yg.id)
                        ? statusDialog.yearGroupIds.filter(id => id !== yg.id)
                        : [...statusDialog.yearGroupIds, yg.id];
                      setStatusDialog({ ...statusDialog, yearGroupIds: ids });
                    }} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#0d6efd' }} />
                    <span style={{ flex: 1 }}>{yg.name} ({yg.birthYearStart}-{yg.birthYearEnd})</span>
                  </label>
                ))}
              </div>
            </div>
            {/* Status: nur lokale Auswahl - wird wie alle anderen Felder erst mit
                "Speichern" persistiert, statt sofort zu speichern UND den Editor
                zu schließen (das hätte bisher alle anderen offenen Änderungen im
                selben Editor verworfen). */}
            <div>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📊 Status</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                {([
                  { value: 'aktiv', label: '🟢 Aktiv', bg: '#d1e7dd', color: '#0f5132' },
                  { value: 'entwurf', label: '⚪ Entwurf', bg: '#e9ecef', color: '#495057' },
                  { value: 'archiviert', label: '⚫ Archiviert', bg: '#f8f9fa', color: '#495057' }
                ] as const).map(s => {
                  const active = statusDialog.editStatus === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setStatusDialog({ ...statusDialog, editStatus: s.value })}
                      style={{
                        flex: 1, padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
                        background: active ? s.bg : '#fff',
                        color: active ? s.color : '#adb5bd',
                        border: active ? '2px solid ' + s.color : '2px solid #dee2e6'
                      }}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            </div>
            {/* Fixierter Footer – IMMER sichtbar (§13.2) */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #e9ecef', marginTop: 0, position: 'sticky', bottom: 0, background: '#fff' }}>
              <button onClick={closeStatusDialog} style={{ ...btnStyleSecondary, border: '1px solid #dee2e6', background: '#fff' }}>Abbrechen</button>
              <button onClick={saveTournamentEdit} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>💾 Speichern</button>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
