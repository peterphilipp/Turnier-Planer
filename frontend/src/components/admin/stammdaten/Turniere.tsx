import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTournaments, getClubs, getYearGroups, apiPost, apiPatch } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, statusBadge, Tournament, Club, YearGroup } from '../shared';

export default function Turniere({ adminPrimary, adminSecondary }: { adminPrimary: string, adminSecondary: string }) {
  const queryClient = useQueryClient();
  const { data: tournaments = [] } = useQuery<Tournament[]>({ queryKey: ['tournaments'], queryFn: getTournaments });
  const { data: clubs = [] } = useQuery<Club[]>({ queryKey: ['clubs'], queryFn: getClubs });
  const { data: yearGroups = [] } = useQuery<YearGroup[]>({ queryKey: ['year-groups'], queryFn: getYearGroups });
  
  const [statusDialog, setStatusDialog] = useState({ open: false, tournament: null as Tournament | null, editName: '', editClubId: '', editStart: '', editEnd: '', editModus: 'GRUPPEN_KO', yearGroupIds: [] as number[] });

  const closeStatusDialog = () => setStatusDialog({ open: false, tournament: null, editName: '', editClubId: '', editStart: '', editEnd: '', editModus: 'GRUPPEN_KO', yearGroupIds: [] });
  
  const updateTournamentStatus = async (status: string) => {
    if (!statusDialog.tournament) return; 
    await apiPatch(`/api/tournaments/${statusDialog.tournament.id}/status`, { status }); 
    queryClient.invalidateQueries({ queryKey: ['tournaments'] }); 
    closeStatusDialog(); 
  };

  const saveTournamentEdit = async () => {
    if (!statusDialog.tournament) return;
    if (!statusDialog.editName.trim()) return alert('Name erforderlich!');
    const patchData: any = {
      name: statusDialog.editName,
      startDate: statusDialog.editStart,
      endDate: statusDialog.editEnd,
      clubId: statusDialog.editClubId && statusDialog.editClubId !== '' ? parseInt(statusDialog.editClubId) : null,
      turnierModus: statusDialog.editModus,
      yearGroupIds: statusDialog.yearGroupIds,
    };
    await apiPatch(`/api/tournaments/${statusDialog.tournament.id}`, patchData);
    queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    closeStatusDialog();
  };

  const createTournament = async () => {
    const name = (document.getElementById('tournamentName') as HTMLInputElement).value;
    const start = (document.getElementById('tournamentStart') as HTMLInputElement).value;
    const end = (document.getElementById('tournamentEnd') as HTMLInputElement).value;
    const clubId = (document.getElementById('tournamentClub') as HTMLInputElement).value;
    const modusEl = document.getElementById('tournamentModus') as HTMLSelectElement;
    const turnierModus = modusEl?.value || 'GRUPPEN_KO';
    if (!name || !start || !end) return alert('Alle Felder erforderlich!');
    const yearGroupIdsEl = document.getElementById('tournamentYearGroups') as HTMLSelectElement;
    const selectedYgs = yearGroupIdsEl?.selectedOptions ? Array.from(yearGroupIdsEl.selectedOptions).map(o => parseInt(o.value)) : [];
    await apiPost('/api/tournaments', { name, startDate: start, endDate: end, status: 'aktiv', clubId: clubId ? parseInt(clubId) : null, turnierModus, yearGroupIds: selectedYgs });
    queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    (document.getElementById('tournamentName') as HTMLInputElement).value = '';
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>🏆 Turnier-Verwaltung</h3>
      
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Turnier-Name" id="tournamentName" style={{ ...inputStyle, width: 200 }} />
        <input type="date" id="tournamentStart" style={inputStyle} />
        <input type="date" id="tournamentEnd" style={inputStyle} />
        <select id="tournamentClub" style={inputStyle}>
          <option value="">-- Kein Verein --</option>
          {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select id="tournamentModus" style={inputStyle} defaultValue="GRUPPEN_KO">
          <option value="GRUPPEN_KO">🏆 Gruppenphase + K.O.</option>
          <option value="KO">⚡ Reines K.O.</option>
          <option value="LIGA">📊 Liga/Rundspiel</option>
          <option value="DOPPEL_KO">🔄 Doppel-K.O.</option>
        </select>
        <button onClick={createTournament} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          ➕ Turnier
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Verein</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Von</th>
            <th style={thStyle}>Bis</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Jahrgänge</th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map(t => (
            <tr key={t.id}>
              <td style={tdStyle}>
                {t.club ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {t.club.logo ? (
                      <img src={t.club.logo} alt={t.club.name} style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />
                    ) : (
                      <span style={{ width: 28, height: 28, borderRadius: 8, background: t.club.primaryColor, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                        {t.club.name.charAt(0)}
                      </span>
                    )}
                    <span style={{ fontSize: 12 }}>{t.club.name}</span>
                  </span>
                ) : <span style={{ color: '#999' }}>–</span>}
              </td>
              <td style={tdStyle}>{t.name}</td>
              <td style={tdStyle}>{new Date(t.startDate).toLocaleDateString('de-DE')}</td>
              <td style={tdStyle}>{new Date(t.endDate).toLocaleDateString('de-DE')}</td>
              <td style={tdStyle}>
                {statusBadge(t.status)}
                <span style={{ marginLeft: 6, fontSize: 12, color: '#0d6efd', fontWeight: 'bold' }}>
                  {t.turnierModus === 'GRUPPEN_KO' ? '🏆 Gruppen+KO' : t.turnierModus === 'KO' ? '⚡ KO' : t.turnierModus === 'LIGA' ? '📊 Liga' : t.turnierModus === 'DOPPEL_KO' ? '🔄 Doppel-KO' : t.turnierModus}
                </span>
              </td>
              <td style={tdStyle}>
                {t.yearGroups && t.yearGroups.length > 0 ? (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {t.yearGroups.map(yg => (
                      <span key={yg.id} style={{ fontSize: 11, background: '#e7f3ff', color: '#0d6efd', padding: '2px 6px', borderRadius: 4 }}>{yg.name}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ color: '#999' }}>–</span>
                )}
              </td>
              <td style={tdStyle}>
                <button onClick={() => setStatusDialog({ open: true, tournament: t, editName: t.name, editClubId: String(t.clubId || ''), editStart: t.startDate.split('T')[0], editEnd: t.endDate.split('T')[0], editModus: t.turnierModus, yearGroupIds: t.yearGroups?.map(yg => yg.id) || [] })} style={{ ...btnStyle, background: adminSecondary, color: '#fff', border: 'none' }}>⚙️ Edit</button>
              </td>
            </tr>
          ))}
          {tournaments.length === 0 && <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#666', padding: 24 }}>Keine Turniere vorhanden.</td></tr>}
        </tbody>
      </table>

      {/* Edit Modal */}
      {statusDialog.open && statusDialog.tournament && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={closeStatusDialog}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, width: 500, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Turnier bearbeiten</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <input value={statusDialog.editName} onChange={e => setStatusDialog({ ...statusDialog, editName: e.target.value })} placeholder="Name" style={inputStyle} />
              <input type="date" value={statusDialog.editStart} onChange={e => setStatusDialog({ ...statusDialog, editStart: e.target.value })} style={inputStyle} />
              <input type="date" value={statusDialog.editEnd} onChange={e => setStatusDialog({ ...statusDialog, editEnd: e.target.value })} style={inputStyle} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Verein</label>
                <select value={statusDialog.editClubId} onChange={e => setStatusDialog({ ...statusDialog, editClubId: e.target.value })} style={inputStyle}>
                  <option value="">-- Kein Verein --</option>
                  {clubs.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📅 Jahrgänge (mehrere auswählbar)</label>
                <select 
                  id="tournamentYearGroups" 
                  multiple 
                  value={statusDialog.yearGroupIds.map(String)}
                  onChange={e => {
                    const selected = Array.from(e.target.selectedOptions).map(o => parseInt(o.value));
                    setStatusDialog({ ...statusDialog, yearGroupIds: selected });
                  }}
                  style={{ ...inputStyle, height: 100 }}
                >
                  {yearGroups.filter(yg => yg.isActive).map(yg => (
                    <option key={yg.id} value={String(yg.id)}>{yg.name} ({yg.birthYearStart}-{yg.birthYearEnd})</option>
                  ))}
                </select>
                <span style={{ fontSize: 11, color: '#6c757d' }}>{statusDialog.yearGroupIds.length} ausgewählt</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Turnier-Modus</label>
                <select value={statusDialog.editModus} onChange={e => setStatusDialog({ ...statusDialog, editModus: e.target.value })} style={inputStyle}>
                  <option value="GRUPPEN_KO">🏆 Gruppenphase + K.O.</option>
                  <option value="KO">⚡ Reines K.O.</option>
                  <option value="LIGA">📊 Liga/Rundspiel</option>
                  <option value="DOPPEL_KO">🔄 Doppel-K.O.</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #eee' }}>
              <button onClick={() => updateTournamentStatus('aktiv')} style={{ ...btnStyle, background: '#198754', color: '#fff', flex: 1 }}>🟢 Aktivieren</button>
              <button onClick={() => updateTournamentStatus('beendet')} style={{ ...btnStyle, background: '#ffc107', color: '#000', flex: 1 }}>🟡 Beenden</button>
              <button onClick={() => updateTournamentStatus('entwurf')} style={{ ...btnStyle, background: '#6c757d', color: '#fff', flex: 1 }}>⚪ Entwurf</button>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={closeStatusDialog} style={{ ...btnStyle, background: '#e9ecef' }}>Abbrechen</button>
              <button onClick={saveTournamentEdit} style={{ ...btnStyle, background: adminPrimary, color: '#fff' }}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
