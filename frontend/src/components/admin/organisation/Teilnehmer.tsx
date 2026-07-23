import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getClubs, getTournamentClubs, addTournamentClub, removeTournamentClub, apiPost, apiDelete } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, Club, Team } from '../shared';

interface Props {
  tournamentId: number | null;
  yearGroupId: number | null;
  tournament?: { id: number; name: string; yearGroups: { id: number; name: string }[] } | null;
}

export default function Teilnehmer({ tournamentId, yearGroupId, tournament }: Props) {
  const queryClient = useQueryClient();
  const [teamForms, setTeamForms] = useState<Record<number, string>>({});
  
  const { data: allClubs = [] } = useQuery<Club[]>({ queryKey: ['clubs'], queryFn: getClubs });
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['teams', tournamentId, yearGroupId],
    queryFn: () => {
      let url = `/api/teams?tournamentId=${tournamentId}`;
      if (yearGroupId) url += `&yearGroupId=${yearGroupId}`;
      return fetch(url).then(r => r.json()).catch(() => []);
    },
    enabled: !!tournamentId,
  });
  const { data: tournamentClubIds = [] as number[] } = useQuery<number[]>({
    queryKey: ['tournament-clubs', tournamentId],
    queryFn: () => getTournamentClubs(tournamentId).then((clubs: any[]) => clubs.map((c: any) => c.id)),
    enabled: !!tournamentId,
  });

  // Vereine die bereits Teams für den ausgewählten Jahrgang haben
  const clubsWithTeams = new Set<number>();
  if (yearGroupId) {
    teams.filter(t => t.yearGroupId === yearGroupId && t.clubId).forEach(t => clubsWithTeams.add(t.clubId!));
  } else {
    teams.filter(t => t.clubId).forEach(t => clubsWithTeams.add(t.clubId!));
  }

  // Vereine die bereits Teams haben → auch als teilnehmend markieren
  const participatingClubIds = new Set<number>(tournamentClubIds);
  if (yearGroupId) {
    teams.filter(t => t.yearGroupId === yearGroupId && t.clubId).forEach(t => participatingClubIds.add(t.clubId!));
  } else {
    teams.filter(t => t.clubId).forEach(t => participatingClubIds.add(t.clubId!));
  }

  // Alle Vereine anzeigen (Checkbox zeigt Teilnahme-Status)

  const handleToggleClub = async (clubId: number) => {
    if (!tournamentId) return;
    
    if (tournamentClubIds.includes(clubId)) {
      await removeTournamentClub(tournamentId, clubId);
    } else {
      await addTournamentClub(tournamentId, clubId);
    }
    queryClient.invalidateQueries({ queryKey: ['tournament-clubs'] });
  };

  const handleAddTeam = async (clubId: number) => {
    if (!tournamentId || !teamForms[clubId]?.trim()) return;
    
    // Team-Nummer für diesen Verein ermitteln
    let existingTeamsForClub: any[] = [];
    if (yearGroupId) {
      existingTeamsForClub = teams.filter(t => t.clubId === clubId && t.yearGroupId === yearGroupId);
    } else {
      existingTeamsForClub = teams.filter(t => t.clubId === clubId);
    }
    const teamNumber = existingTeamsForClub.length + 1;
    const club = allClubs.find(c => c.id === clubId);
    const teamName = `${club?.name || 'Verein'} ${teamNumber}`;
    
    await apiPost('/api/teams', { 
      name: teamName, 
      tournamentId, 
      yearGroupId,
      clubId,
      groupId: null // Wird später in GruppenTeams zugewiesen
    });
    
    setTeamForms(prev => ({ ...prev, [clubId]: '' }));
    queryClient.invalidateQueries({ queryKey: ['teams'] });
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!confirm('Team löschen?')) return;
    await apiDelete(`/api/teams/${teamId}`);
    queryClient.invalidateQueries({ queryKey: ['teams'] });
  };

  // Teams pro Verein + Jahrgang gruppieren
  const teamsByClub = allClubs.reduce<Record<string, Team[]>>((acc, club) => {
    let clubTeams: any[] = [];
    if (yearGroupId) {
      clubTeams = teams.filter(t => t.clubId === club.id && t.yearGroupId === yearGroupId);
    } else {
      clubTeams = teams.filter(t => t.clubId === club.id);
    }
    const key = `${club.id}_${yearGroupId || 'all'}`;
    if (clubTeams.length > 0) acc[key] = clubTeams;
    return acc;
  }, {});

  if (!tournamentId) {
    return (
      <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <p style={{ color: '#dc3545', margin: 0 }}>⚠️ Bitte wähle zuerst ein Turnier aus.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>📋 Teilnehmer-Verwaltung</h3>
        <span style={{ fontSize: 14, color: '#6c757d' }}>
          {Object.keys(teamsByClub).length} Vereine · {teams.length} Teams insgesamt
        </span>
      </div>

      {/* Vereins-Auswahl */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: '600', color: '#495057' }}>
          🏅 Vereine auswählen (mehrere möglich)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {allClubs.map(club => (
            <label 
              key={club.id}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 10, 
                padding: '12px 16px', 
                background: participatingClubIds.has(club.id) ? '#e7f3ff' : '#f8f9fa',
                border: `2px solid ${participatingClubIds.has(club.id) ? '#0d6efd' : '#dee2e6'}`,
                borderRadius: 10, 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <input 
                type="checkbox" 
                checked={participatingClubIds.has(club.id)}
                onChange={() => handleToggleClub(club.id)}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              {club.logo ? (
                <img src={club.logo} alt={club.name} style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
              ) : (
                <span style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 8, 
                  background: club.primaryColor || '#6c757d', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#fff', 
                  fontSize: 14, 
                  fontWeight: 'bold'
                }}>
                  {club.name.charAt(0)}
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: '600', color: '#212529', fontSize: 14 }}>{club.name}</div>
                {club.city && <div style={{ fontSize: 12, color: '#6c757d' }}>{club.city}</div>}
                {participatingClubIds.has(club.id) && (
                  <span style={{ fontSize: 11, color: '#0d6efd', fontWeight: '500' }}>✓ teilnehmend</span>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Teams pro Verein */}
      {Object.keys(teamsByClub).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: '600', color: '#495057' }}>
            ✅ Teilnehmende Vereine & Teams
          </h4>
          
          {Object.entries(teamsByClub).map(([key, clubTeams]) => {
            const clubIdFromKey = parseInt(key.split('_')[0]);
            const club = allClubs.find(c => c.id === clubIdFromKey);
            if (!club) return null;
            
            return (
              <div key={club.id} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  {club.logo ? (
                    <img src={club.logo} alt={club.name} style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />
                  ) : (
                    <span style={{ 
                      width: 28, 
                      height: 28, 
                      borderRadius: 8, 
                      background: club.primaryColor || '#6c757d', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: '#fff', 
                      fontSize: 13, 
                      fontWeight: 'bold'
                    }}>
                      {club.name.charAt(0)}
                    </span>
                  )}
                  <strong style={{ fontSize: 14, color: '#212529' }}>{club.name}</strong>
                  {yearGroupId && (() => {
                    const yg = tournament?.yearGroups?.find(y => y.id === yearGroupId);
                    return yg ? (
                      <span style={{ fontSize: 11, background: '#e7f3ff', color: '#0d6efd', padding: '2px 8px', borderRadius: 4 }}>
                        📅 {yg.name}
                      </span>
                    ) : null;
                  })()}
                  <span style={{ fontSize: 12, color: '#6c757d' }}>({clubTeams.length} Teams)</span>
                </div>

                {/* Team-Liste */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginLeft: 40 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Teamname</th>
                      <th style={{ ...thStyle, width: 60 }}>Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clubTeams.map((team, idx) => (
                      <tr key={team.id} style={{ background: idx % 2 === 0 ? '#fff' : 'rgba(0,0,0,0.02)' }}>
                        <td style={{ ...tdStyle, fontWeight: 'bold', color: '#6c757d', width: 40 }}>{idx + 1}</td>
                        <td style={tdStyle}>
                          {team.name}
                          {team.yearGroup && (
                            <span style={{ marginLeft: 8, fontSize: 11, background: '#f8f9fa', color: '#6c757d', padding: '2px 6px', borderRadius: 4 }}>
                              📅 {team.yearGroup.name}
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <button 
                            onClick={() => handleDeleteTeam(team.id)} 
                            style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none', fontSize: 12 }}
                          >🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Neues Team hinzufügen */}
                <div style={{ display: 'flex', gap: 8, marginLeft: 40, marginTop: 8 }}>
                  <input 
                    type="text" 
                    value={teamForms[club.id] || ''}
                    onChange={e => setTeamForms(prev => ({ ...prev, [club.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAddTeam(club.id)}
                    placeholder={`+ Team ${clubTeams.length + 1}`}
                    style={{ ...inputStyle, width: 200 }}
                  />
                  <button 
                    onClick={() => handleAddTeam(club.id)} 
                    style={{ ...btnStyle, background: '#28a745', color: '#fff', border: 'none' }}
                  >✓ Hinzufügen</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info-Box */}
      <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 10, border: '1px solid #dee2e6' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
          💡 <strong>So funktioniert's:</strong><br/>
          1. Vereine anklicken die am Turnier teilnehmen<br/>
          2. Pro Verein automatisch Teams anlegen (TSV Holm 1, TSV Holm 2...)<br/>
          3. In "👥 Gruppen & Teams" die Teams den Gruppen zuweisen
        </p>
      </div>
    </div>
  );
}
