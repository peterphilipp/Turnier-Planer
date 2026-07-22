import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTournaments, getClubs, apiPost, apiPatch } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, statusBadge, Tournament, Club } from '../shared';

export default function Turniere({ adminPrimary, adminSecondary }: { adminPrimary: string, adminSecondary: string }) {
  const queryClient = useQueryClient();
  const { data: tournaments = [] } = useQuery<Tournament[]>({ queryKey: ['tournaments'], queryFn: getTournaments });
  const { data: clubs = [] } = useQuery<Club[]>({ queryKey: ['clubs'], queryFn: getClubs });
  
  const [statusDialog, setStatusDialog] = useState({ open: false, tournament: null as Tournament | null, editName: '', editClubId: '', editStart: '', editEnd: '' });

  const closeStatusDialog = () => setStatusDialog({ open: false, tournament: null, editName: '', editClubId: '', editStart: '', editEnd: '' });
  
  const updateTournamentStatus = async (status: string) => {
    if (!statusDialog.tournament) return; 
    await apiPatch(`/api/tournaments/${statusDialog.tournament.id}/status`, { status }); 
    queryClient.invalidateQueries({ queryKey: ['tournaments'] }); 
    closeStatusDialog(); 
  };

  const saveTournamentEdit = async () => {
    if (!statusDialog.tournament) return;
    if (!statusDialog.editName.trim()) return alert('Name erforderlich!');
    await apiPatch(`/api/tournaments/${statusDialog.tournament.id}`, {
      name: statusDialog.editName,
      startDate: statusDialog.editStart,
      endDate: statusDialog.editEnd,
      clubId: statusDialog.editClubId ? parseInt(statusDialog.editClubId) : null,
    });
    queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    closeStatusDialog();
  };

  const createTournament = async () => {
    const name = (document.getElementById('tournamentName') as HTMLInputElement).value;
    const start = (document.getElementById('tournamentStart') as HTMLInputElement).value;
    const end = (document.getElementById('tournamentEnd') as HTMLInputElement).value;
    const clubId = (document.getElementById('tournamentClub') as HTMLInputElement).value;
    if (!name || !start || !end) return alert('Alle Felder erforderlich!');
    await apiPost('/api/tournaments', { name, startDate: start, endDate: end, status: 'aktiv', clubId: clubId ? parseInt(clubId) : null });
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
            <th style={thStyle}>Aktion</th>
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
              <td style={tdStyle}>{statusBadge(t.status)}</td>
              <td style={tdStyle}>
                <button onClick={() => setStatusDialog({ open: true, tournament: t, editName: t.name, editClubId: String(t.clubId || ''), editStart: t.startDate.split('T')[0], editEnd: t.endDate.split('T')[0] })} style={{ ...btnStyle, background: adminSecondary, color: '#fff', border: 'none' }}>⚙️ Edit</button>
              </td>
            </tr>
          ))}
          {tournaments.length === 0 && <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#666', padding: 24 }}>Keine Turniere vorhanden.</td></tr>}
        </tbody>
      </table>

      {/* Edit Modal */}
      {statusDialog.open && statusDialog.tournament && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={closeStatusDialog}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 16, width: 400, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Turnier bearbeiten</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <input value={statusDialog.editName} onChange={e => setStatusDialog({ ...statusDialog, editName: e.target.value })} placeholder="Name" style={inputStyle} />
              <input type="date" value={statusDialog.editStart} onChange={e => setStatusDialog({ ...statusDialog, editStart: e.target.value })} style={inputStyle} />
              <input type="date" value={statusDialog.editEnd} onChange={e => setStatusDialog({ ...statusDialog, editEnd: e.target.value })} style={inputStyle} />
              <select value={statusDialog.editClubId} onChange={e => setStatusDialog({ ...statusDialog, editClubId: e.target.value })} style={inputStyle}>
                <option value="">-- Kein Verein --</option>
                {clubs.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
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
