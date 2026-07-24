import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTournaments, getClubs, getYearGroups, apiPost, apiPatch } from '../../../api';
import { btnStyleSecondary, Tournament, Club, YearGroup } from '../shared';
import EditModal from '../EditModal';

export default function Turniere({ adminPrimary, adminSecondary }: { adminPrimary: string, adminSecondary: string }) {
  const queryClient = useQueryClient();
  const { data: tournaments = [] } = useQuery<Tournament[]>({ queryKey: ['tournaments'], queryFn: getTournaments });
  const { data: clubs = [] } = useQuery<Club[]>({ queryKey: ['clubs'], queryFn: getClubs });
  const { data: yearGroups = [] } = useQuery<YearGroup[]>({ queryKey: ['year-groups'], queryFn: getYearGroups });
  
  const [statusDialog, setStatusDialog] = useState({ open: false, tournament: null as Tournament | null, editName: '', editClubId: '', editStart: '', editEnd: '', editModus: 'GRUPPEN_KO', yearGroupIds: [] as number[], logoFile: null as File | null, editHasSponsor: false, editSponsorName: '', editSponsorUrl: '' });

  const closeStatusDialog = () => setStatusDialog({ open: false, tournament: null, editName: '', editClubId: '', editStart: '', editEnd: '', editModus: 'GRUPPEN_KO', yearGroupIds: [], logoFile: null, editHasSponsor: false, editSponsorName: '', editSponsorUrl: '' });
  
  const updateTournamentStatus = async (status: string) => {
    if (!statusDialog.tournament) return; 
    await apiPatch(`/api/tournaments/${statusDialog.tournament.id}/status`, { status }); 
    queryClient.invalidateQueries({ queryKey: ['tournaments'] }); 
    closeStatusDialog(); 
  };

  const saveTournamentEdit = async () => {
    if (!statusDialog.tournament) return;
    if (!statusDialog.editName.trim()) return await modal.alert({ title: 'Hinweis', message: 'Name erforderlich!' });
    const patchData: any = {
      name: statusDialog.editName, startDate: statusDialog.editStart, endDate: statusDialog.editEnd,
      clubId: statusDialog.editClubId && statusDialog.editClubId !== '' ? parseInt(statusDialog.editClubId) : null,
      turnierModus: statusDialog.editModus, yearGroupIds: statusDialog.yearGroupIds,
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

  const createTournament = async () => {
    const nameEl = document.getElementById('tournamentName') as HTMLInputElement;
    const startEl = document.getElementById('tournamentStart') as HTMLInputElement;
    const endEl = document.getElementById('tournamentEnd') as HTMLInputElement;
    const clubEl = document.getElementById('tournamentClub') as HTMLInputElement;
    const modusEl = document.getElementById('tournamentModus') as HTMLSelectElement;
    const ygsEl = document.getElementById('tournamentYearGroups') as HTMLSelectElement;
    const name = nameEl?.value, start = startEl?.value, end = endEl?.value;
    if (!name || !start || !end) return await modal.alert({ title: 'Hinweis', message: 'Alle Felder erforderlich!' });
    const selectedYgs = ygsEl?.selectedOptions ? Array.from(ygsEl.selectedOptions).map(o => parseInt(o.value)) : [];
    await apiPost('/api/tournaments', { name, startDate: start, endDate: end, status: 'aktiv', clubId: clubEl?.value ? parseInt(clubEl.value) : null, turnierModus: modusEl?.value || 'GRUPPEN_KO', yearGroupIds: selectedYgs });
    queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    nameEl.value = ''; startEl.value = ''; endEl.value = '';
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = { aktiv: { bg: '#d1e7dd', color: '#0f5132' }, beendet: { bg: '#fff3cd', color: '#856404' }, entwurf: { bg: '#e9ecef', color: '#495057' } };
    const c = colors[status] || colors.entwurf;
    return <span style={{ padding: '4px 12px', background: c.bg, color: c.color, borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{status}</span>;
  };

  const modusIcon = (m: string) => m === 'GRUPPEN_KO' ? '🏆 Gruppen+KO' : m === 'KO' ? '⚡ KO' : m === 'LIGA' ? '📊 Liga' : m;

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>🏆 Turnier-Verwaltung</h3>
      
      {/* Neue Turnier Form */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Turnier-Name" id="tournamentName" style={{ flex: 1, minWidth: 200, padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} />
        <input type="date" id="tournamentStart" style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} />
        <input type="date" id="tournamentEnd" style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} />
        <select id="tournamentClub" style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }}>
          <option value="">-- Kein Verein --</option>
          {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select id="tournamentModus" style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} defaultValue="GRUPPEN_KO">
          <option value="GRUPPEN_KO">🏆 Gruppenphase + K.O.</option>
          <option value="KO">⚡ Reines K.O.</option>
          <option value="LIGA">📊 Liga/Rundspiel</option>
        </select>
        <button onClick={createTournament} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>➕ Turnier</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '2px solid #e9ecef' }}><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Verein</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Name</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Sponsor-Logo</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>Von</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>Bis</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'center' }}>Status</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Jahrgänge</th></tr></thead>
        <tbody>
          {tournaments.map(t => (
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
              <td style={{ padding: '10px 12px', textAlign: 'center' }}>{statusBadge(t.status)}<span style={{ marginLeft: 6, fontSize: 12 }}>{modusIcon(t.turnierModus)}</span></td>
              <td style={{ padding: '10px 12px' }}>
                {t.yearGroups && t.yearGroups.length > 0 ? (<div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{t.yearGroups.map(yg => (<span key={yg.id} style={{ fontSize: 11, background: '#e7f3ff', color: '#0d6efd', padding: '2px 6px', borderRadius: 4 }}>{yg.name}</span>))}</div>) : <span style={{ color: '#999' }}>–</span>}
              </td>
              <td style={{ padding: '8px 12px' }}>
                <button onClick={() => setStatusDialog({ open: true, tournament: t, editName: t.name, editClubId: String(t.clubId || ''), editStart: t.startDate.split('T')[0], editEnd: t.endDate.split('T')[0], editModus: t.turnierModus, yearGroupIds: t.yearGroups?.map(yg => yg.id) || [], logoFile: null, editHasSponsor: t.hasSponsor || false, editSponsorName: t.sponsorName || '', editSponsorUrl: t.sponsorUrl || '' })} style={{ padding: '10px 16px', border: 'none', background: adminSecondary, color: '#fff', borderRadius: 8, cursor: 'pointer', minHeight: 40, minWidth: 80, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 15 }}>
                  <span>⚙️</span><span>Edit</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Edit Modal */}
      {statusDialog.open && statusDialog.tournament && (
        <EditModal title={`Turnier bearbeiten: ${statusDialog.tournament.name}`} onClose={closeStatusDialog}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input value={statusDialog.editName} onChange={e => setStatusDialog({ ...statusDialog, editName: e.target.value })} placeholder="Name" style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <input type="date" value={statusDialog.editStart} onChange={e => setStatusDialog({ ...statusDialog, editStart: e.target.value })} style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} />
              <input type="date" value={statusDialog.editEnd} onChange={e => setStatusDialog({ ...statusDialog, editEnd: e.target.value })} style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }} />
            </div>
            <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Verein</label>
              <select value={statusDialog.editClubId} onChange={e => setStatusDialog({ ...statusDialog, editClubId: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }}>
                <option value="">-- Kein Verein --</option>
                {clubs.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </div>

              {/* Sponsor Section */}
              <div style={{ marginTop: 8, padding: 12, border: '1px solid #dee2e6', borderRadius: 8, background: '#f8f9fa' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 'bold', fontSize: 13, cursor: 'pointer', marginBottom: statusDialog.editHasSponsor ? 12 : 0 }}>
                  <input type="checkbox" checked={statusDialog.editHasSponsor} onChange={e => setStatusDialog({ ...statusDialog, editHasSponsor: e.target.checked })} style={{ width: 16, height: 16 }} />
                  Hat Sponsor?
                </label>
                {statusDialog.editHasSponsor && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Sponsor Name</label>
                      <input value={statusDialog.editSponsorName} onChange={e => setStatusDialog({ ...statusDialog, editSponsorName: e.target.value })} placeholder="Name des Sponsors" style={{ width: '100%', padding: '8px 10px', border: '1px solid #dee2e6', borderRadius: 6, boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Sponsor URL (Link)</label>
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
            <div><label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Turnier-Modus</label>
              <select value={statusDialog.editModus} onChange={e => setStatusDialog({ ...statusDialog, editModus: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8 }}>
                <option value="GRUPPEN_KO">🏆 Gruppenphase + K.O.</option><option value="KO">⚡ Reines K.O.</option><option value="LIGA">📊 Liga/Rundspiel</option>
              </select>
            </div>

            {/* Status Buttons */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #e9ecef' }}>
              <button onClick={() => updateTournamentStatus('aktiv')} style={{ flex: 1, padding: '8px 16px', background: '#d1e7dd', color: '#0f5132', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>🟢 Aktiv</button>
              <button onClick={() => updateTournamentStatus('beendet')} style={{ flex: 1, padding: '8px 16px', background: '#fff3cd', color: '#856404', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>🟡 Beenden</button>
              <button onClick={() => updateTournamentStatus('entwurf')} style={{ flex: 1, padding: '8px 16px', background: '#e9ecef', color: '#495057', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>⚪ Entwurf</button>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={closeStatusDialog} style={{ ...btnStyleSecondary, border: '1px solid #dee2e6', background: '#fff' }}>Abbrechen</button>
              <button onClick={saveTournamentEdit} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>💾 Speichern</button>
            </div>
          </div>
        </EditModal>
      )}
    </div>
  );
}
