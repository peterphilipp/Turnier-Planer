import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiPatch, apiDelete } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, Group, Team } from '../shared';

interface Props {
  tournamentId: number | null;
}

export default function GruppenTeams({ tournamentId }: Props) {
  const queryClient = useQueryClient();
  
  // State für neue Gruppe/Team
  const [newGroup, setNewGroup] = useState('');
  const [showTeamForm, setShowTeamForm] = useState<number | null>(null);
  const [newTeamName, setNewTeamName] = useState('');

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups', tournamentId],
    queryFn: () => fetch(`/api/groups/${tournamentId}`).then(r => r.json()).catch(() => []),
    enabled: !!tournamentId,
    staleTime: 5000
  });

  const { data: allTeams = {} as Record<number, Team[]> } = useQuery<Record<number, Team[]>>({
    queryKey: ['teams'],
    queryFn: async () => {
      if (!tournamentId) return {};
      const result: Record<number, Team[]> = {};
      for (const group of groups) {
        result[group.id] = await fetch(`/api/teams?groupId=${group.id}`).then(r => r.json()).catch(() => []);
      }
      return result;
    },
    enabled: !!tournamentId && groups.length > 0,
    staleTime: 5000
  });

  const handleAddGroup = async () => {
    if (!newGroup.trim() || !tournamentId) return alert('Gruppenname erforderlich!');
    await apiPost('/api/groups', { name: newGroup.trim(), tournamentId });
    setNewGroup('');
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm('Gruppe löschen? Alle zugewiesenen Teams werden ebenfalls gelöscht.')) return;
    await apiDelete(`/api/groups/${id}`);
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  };

  const handleAddTeam = async (groupId: number) => {
    if (!newTeamName.trim()) return alert('Teamname erforderlich!');
    await apiPost('/api/teams', { name: newTeamName.trim(), groupId });
    setNewTeamName('');
    setShowTeamForm(null);
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  };

  const handleDeleteTeam = async (id: number) => {
    if (!confirm('Team löschen?')) return;
    await apiDelete(`/api/teams/${id}`);
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  };

  // Gruppen-Farben für visuelle Trennung
  const groupColors = ['#e7f3ff', '#d4edda', '#fff3cd', '#f8d7da', '#d1ecf1', '#e2d5f0'];

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
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>👥 Gruppen & Teams</h3>
      </div>

      {/* Neue Gruppe anlegen */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'flex-end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Gruppenname</label>
          <input 
            type="text" 
            value={newGroup} 
            onChange={e => setNewGroup(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
            placeholder="z.B. Gruppe A, Gruppe B..." 
            style={{ ...inputStyle, width: 200 }}
          />
        </div>
        <button onClick={handleAddGroup} style={{ ...btnStyle, background: '#0d6efd', color: '#fff', border: 'none', fontWeight: '600' }}>
          + Gruppe anlegen
        </button>
      </div>

      {/* Gruppen-Liste */}
      {groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
          Keine Gruppen angelegt. Erstelle deine erste Gruppe oben.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {groups.map((group, idx) => (
            <div key={group.id} style={{ 
              background: groupColors[idx % groupColors.length], 
              padding: 20, 
              borderRadius: 12, 
              border: `2px solid ${groupColors[(idx + 1) % groupColors.length]}40` 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: 16, fontWeight: '700', color: '#212529' }}>
                  {group.name} 
                  <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 'normal', color: '#666' }}>
                    ({(allTeams[group.id] || []).length} Teams)
                  </span>
                </h4>
                <button onClick={() => handleDeleteGroup(group.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none', fontSize: 12 }}>🗑️</button>
              </div>

              {/* Team-Tabelle */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Teamname</th>
                    <th style={thStyle}>Spiele</th>
                    <th style={thStyle}>Tore</th>
                    <th style={thStyle}>Punkte</th>
                    <th style={{ ...thStyle, width: 80 }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {(allTeams[group.id] || []).map((team, i) => (
                    <tr key={team.id} style={{ background: i % 2 === 0 ? '#fff' : 'rgba(255,255,255,0.6)' }}>
                      <td style={{ ...tdStyle, fontWeight: 'bold', color: '#6c757d' }}>{i + 1}</td>
                      <td style={tdStyle}>{team.name}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>-</td>
                      <td style={{ ...tdStyle, textAlign: 'center', color: '#6c757d' }}>{team.goalsFor ?? 0}:{team.goalsAgainst ?? 0}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', color: '#0d6efd' }}>-</td>
                      <td style={tdStyle}>
                        <button onClick={() => handleDeleteTeam(team.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none', fontSize: 12 }}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Team-Formular */}
                  {showTeamForm === group.id ? (
                    <tr style={{ background: '#fff' }}>
                      <td colSpan={5} style={{ padding: 12 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input 
                            type="text" 
                            value={newTeamName} 
                            onChange={e => setNewTeamName(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleAddTeam(group.id)}
                            placeholder="Teamname eingeben..." 
                            style={{ ...inputStyle, flex: 1 }}
                            autoFocus
                          />
                          <button onClick={() => handleAddTeam(group.id)} style={{ ...btnStyle, background: '#28a745', color: '#fff', border: 'none' }}>✓</button>
                          <button onClick={() => { setShowTeamForm(null); setNewTeamName(''); }} style={{ ...btnStyle, background: '#e9ecef', border: 'none' }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>

              <button 
                onClick={() => setShowTeamForm(showTeamForm === group.id ? null : group.id)} 
                style={{ ...btnStyle, marginTop: 12, background: '#f8f9fa', fontSize: 13 }}
              >
                + Team hinzufügen
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Info-Box */}
      <div style={{ marginTop: 24, padding: 16, background: '#f8f9fa', borderRadius: 10, border: '1px solid #dee2e6' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
          💡 <strong>Tipp:</strong> Erstelle zuerst Gruppen (z.B. Gruppe A–D), dann füge Teams hinzu. 
          Sobald Teams angelegt sind, kannst du in "⚽ Spielplan" Begegnungen planen und Ergebnisse eintragen.
        </p>
      </div>
    </div>
  );
}
