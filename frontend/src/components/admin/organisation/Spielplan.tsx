import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPatch } from '../../../api';
import { Match, TimeSlot, Field, Team, StandingsEntry } from '../shared';

interface Props {
  tournamentId: number | null;
  yearGroupId: number | null;
}

export default function Spielplan({ tournamentId, yearGroupId }: Props) {
  const queryClient = useQueryClient();
  const [editingScore, setEditingScore] = useState<{ matchId: number; side: 'A' | 'B'; value: string } | null>(null);
  const [showTable, setShowTable] = useState(false);

  // Matches laden (nur für selected yearGroup)
  const { data: allMatches = [] } = useQuery<Match[]>({
    queryKey: ['matches', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const res = await fetch(`/api/matches/${tournamentId}`);
      return res.json().catch(() => []);
    },
    enabled: !!tournamentId,
  });

  // Nach yearGroupId filtern (Backend filtert nicht danach)
  const matches = Array.isArray(allMatches) ? (
    yearGroupId
      ? allMatches.filter(m => m.yearGroupId === yearGroupId)
      : allMatches
  ) : [];

  // Fields für Labels
  const { data: fields = [] } = useQuery<Field[]>({
    queryKey: ['fields', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const res = await fetch(`/api/fields?tournamentId=${tournamentId}`);
      return res.json().catch(() => []);
    },
    enabled: !!tournamentId,
  });

  // Teams für Namen
  const { data: teamsRaw } = useQuery<Team[]>({
    queryKey: ['teams-all', tournamentId, yearGroupId],
    queryFn: async () => {
      if (!tournamentId || !yearGroupId) return [];
      const res = await fetch(`/api/teams?tournamentId=${tournamentId}&yearGroupId=${yearGroupId}`);
      return res.json().catch(() => []);
    },
    enabled: !!tournamentId && !!yearGroupId,
  });

  // Teams als Map für schnellen Lookup
  const teamsMap: Record<number, Team> = {};
  if (Array.isArray(teamsRaw)) {
    for (const t of teamsRaw) { teamsMap[t.id] = t; }
  }

  // Standings client-seitig berechnen pro Gruppe
  interface GroupStanding {
    groupId: number | null;
    groupName: string;
    teamId: number;
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    points: number;
  }

  const groupStandings = React.useMemo(() => {
    if (!matches.length) return [];
    
    // Alle Gruppen-Phasen sammeln (z.B. "Gruppe A", "Liga")
    const phases = Array.from(new Set(matches.map(m => m.phase).filter(Boolean)));
    
    const result: GroupStanding[] = [];
    
    for (const phase of phases) {
      // Alle Teams dieser Gruppe sammeln
      const teamIds = new Set<number>();
      matches.forEach(m => {
        if ((m.phase === phase || !phase) && m.teamAId) teamIds.add(m.teamAId);
        if ((m.phase === phase || !phase) && m.teamBId) teamIds.add(m.teamBId);
      });
      
      // Stats pro Team berechnen
      const stats = new Map<number, { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number }>();
      
      matches.forEach(m => {
        if (m.phase !== phase || !m.scoreA && !m.scoreB) return;
        const scoreA = m.scoreA ?? 0;
        const scoreB = m.scoreB ?? 0;
        
        [m.teamAId, m.teamBId].forEach((teamId, idx) => {
          if (!teamId) return;
          let s = stats.get(teamId);
          if (!s) { s = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }; stats.set(teamId, s); }
          s.played++;
          if (idx === 0) {
            s.goalsFor += scoreA;
            s.goalsAgainst += scoreB;
            if (scoreA > scoreB) s.won++; else if (scoreA === scoreB) s.drawn++; else s.lost++;
          } else {
            s.goalsFor += scoreB;
            s.goalsAgainst += scoreA;
            if (scoreB > scoreA) s.won++; else if (scoreB === scoreA) s.drawn++; else s.lost++;
          }
        });
      });
      
      // Zu Standings umwandeln
      stats.forEach((s, teamId) => {
        result.push({
          groupId: null,
          groupName: phase || 'Liga',
          teamId,
          teamName: teamsMap[teamId]?.name || `Team #${teamId}`,
          ...s,
          points: s.won * 3 + s.drawn
        });
      });
    }
    
    // Nach Gruppe sortieren, dann nach Punkten DESC, Torverhältnis DESC
    return result.sort((a, b) => {
      if (a.groupName !== b.groupName) return a.groupName.localeCompare(b.groupName);
      const diffA = a.goalsFor - a.goalsAgainst;
      const diffB = b.goalsFor - b.goalsAgainst;
      if (b.points !== a.points) return b.points - a.points;
      if (diffB !== diffA) return diffB - diffA;
      return b.goalsFor - a.goalsFor;
    });
  }, [matches, teamsMap]);

  // Gruppen gruppieren
  const groups = React.useMemo(() => {
    const map: Record<string, GroupStanding[]> = {};
    groupStandings.forEach(s => {
      if (!map[s.groupName]) map[s.groupName] = [];
      map[s.groupName].push(s);
    });
    // Sortierte Gruppen-Namen
    return Object.keys(map).sort().map(name => ({ name, teams: map[name] }));
  }, [groupStandings]);

  // Lese Timing-Parameter aus dem LocalStorage
  let timingParams: any = null;
  if (tournamentId && yearGroupId) {
    try {
      const stored = localStorage.getItem(`tournament_${tournamentId}_yearGroup_${yearGroupId}_timing`);
      if (stored) timingParams = JSON.parse(stored);
    } catch (e) {}
  }

  // Alle Matches sortiert nach Zeit, dann Spielfeld
  const allMatchesSorted = [...matches].sort((a, b) => {
    const timeA = new Date(a.time).getTime();
    const timeB = new Date(b.time).getTime();
    if (timeA !== timeB) return timeA - timeB;
    
    // Wenn Zeit gleich ist, nach Spielfeld sortieren
    const fieldA = a.fieldId || 0;
    const fieldB = b.fieldId || 0;
    return fieldA - fieldB;
  });

  if (!tournamentId || !yearGroupId) {
    return <div style={{ padding: 24, color: '#666' }}>Bitte Turnier und Jahrgang auswählen.</div>;
  }

  const getFieldLabel = (fieldId: number | null) => {
    const field = fields.find(f => f.id === fieldId);
    return field ? field.name : '-';
  };

  const getTeamName = (teamId: number | null) => {
    if (!teamId) return 'TBD';
    const team = teamsMap[teamId];
    return team?.name || 'Unbekannt';
  };

  const handleScoreChange = async (matchId: number, side: 'A' | 'B', value: string) => {
    if (value === '') return;
    const numVal = parseInt(value);
    if (!isNaN(numVal) && numVal >= 0 && tournamentId) {
      try {
        await apiPatch(`/api/matches/${matchId}`, { 
          [`score${side}`]: numVal,
          status: 'gespielt'
        });
        // Alle relevanten Queries invalidieren
        queryClient.invalidateQueries({ queryKey: ['matches', tournamentId] });
        queryClient.invalidateQueries({ queryKey: ['standings', tournamentId, yearGroupId] });
      } catch (e) {
        console.error('Score speichern fehlgeschlagen:', e);
      }
    }
  };

  const advanceMatch = async (matchId: number) => {
    try {
      if (tournamentId && yearGroupId) {
        await apiPatch(`/api/matches/${matchId}/advance`, {});
      }
      queryClient.invalidateQueries({ queryKey: ['matches', tournamentId, yearGroupId] });
      queryClient.invalidateQueries({ queryKey: ['brackets', tournamentId] });
    } catch (e) {
      alert('Fehler beim Fortsetzen: ' + (e as Error).message);
    }
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: '600', color: '#212557' }}>⚽ Spielplan</h3>
        {matches.length > 0 && (
          <button
            onClick={() => setShowTable(!showTable)}
            style={{
              padding: '8px 16px',
              background: showTable ? '#212557' : '#f8f9fa',
              color: showTable ? '#fff' : '#495057',
              border: `2px solid ${showTable ? '#212557' : '#dee2e6'}`,
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            📊 Tabelle {showTable ? '▼' : '▶'}
          </button>
        )}
      </div>
      
      {timingParams && (
        <div style={{ marginBottom: 20, padding: 16, background: '#f8f9fa', borderRadius: 10, border: '1px solid #dee2e6' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#495057' }}>⏱️ Zeitplan-Info (aktueller Jahrgang)</h4>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#666', flexWrap: 'wrap' }}>
            <span><strong>Spieldauer:</strong> {timingParams.matchDuration} Min. {timingParams.halves > 1 ? `(${timingParams.halves} Halbzeiten)` : ''}</span>
            {timingParams.halves > 1 && <span><strong>Halbzeitpause:</strong> {timingParams.halftimeBreak} Min.</span>}
            <span><strong>Wechselpause:</strong> {timingParams.breakDuration} Min.</span>
          </div>
        </div>
      )}
      
      {/* Tabellen pro Gruppe */}
      {showTable && groups.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          {groups.map((group, groupIdx) => {
            const sortedTeams = [...group.teams].sort((a, b) => {
              if (b.points !== a.points) return b.points - a.points;
              const diffA = a.goalsFor - a.goalsAgainst;
              const diffB = b.goalsFor - b.goalsAgainst;
              if (diffB !== diffA) return diffB - diffA;
              return b.goalsFor - a.goalsFor;
            });
            
            return (
              <div key={group.name} style={{ marginBottom: 24 }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: '600', color: '#212557' }}>
                  📋 {group.name}
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 500 }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', minWidth: 40 }}>Pl.</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>Team</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', minWidth: 35 }}>Sp.</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', minWidth: 30 }}>S</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', minWidth: 30 }}>U</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', minWidth: 30 }}>N</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', minWidth: 55 }}>Tore</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '2px solid #dee2e6', minWidth: 40, fontWeight: 'bold' }}>Pkt.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTeams.map((entry, idx) => {
                        const goalDiff = entry.goalsFor - entry.goalsAgainst;
                        return (
                          <tr key={entry.teamId} style={{
                            background: idx % 2 === 0 ? '#fff' : '#f8f9fa',
                            borderBottom: '1px solid #e9ecef'
                          }}>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', color: idx < 3 ? '#0d6efd' : '#495057' }}>
                              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1)}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: '500' }}>
                              {entry.teamName}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#666' }}>{entry.played}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#198754' }}>{entry.won}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#ffc107' }}>{entry.drawn}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: '#dc3545' }}>{entry.lost}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', color: goalDiff > 0 ? '#198754' : goalDiff < 0 ? '#dc3545' : '#666' }}>
                              {entry.goalsFor}:{entry.goalsAgainst} ({goalDiff > 0 ? '+' : ''}{goalDiff})
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', fontSize: 15, color: '#212557' }}>{entry.points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {matches.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
          <p style={{ fontSize: 48, margin: '0 0 16px 0' }}>📋</p>
          <p>Noch keine Spiele geplant.</p>
          <p style={{ fontSize: 13 }}>Gehe zu "Modus" und generiere den Spielplan. Nach dem Eintragen von Scores erscheint hier die Tabelle.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allMatchesSorted.map(match => (
            <div key={match.id} style={{ 
              border: '1px solid #e9ecef', 
              borderRadius: 12, 
              padding: 16,
              background: match.status === 'abgeschlossen' ? '#f8fff8' : match.status === 'in_spiel' ? '#fff8f0' : '#fff'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 12, color: '#666' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontWeight: 'bold', color: '#495057' }}>
                    🕒 {new Date(match.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                  </span>
                  <span>📍 {getFieldLabel(match.fieldId)}</span>
                </div>
                <span style={{ 
                  padding: '2px 8px', 
                  borderRadius: 4, 
                  background: match.phase === 'gruppenspiel' ? '#e7f5ff' : (match.phase === 'k.o.' || match.phase === 'K.O.') ? '#fff3e0' : '#f0f0f0',
                  fontSize: 11,
                  fontWeight: '600'
                }}>
                  {match.runde ? `📋 ${match.runde}` : match.phase}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Team A */}
                <div style={{ flex: 1, fontSize: 14, fontWeight: '500' }}>
                  {getTeamName(match.teamAId)}
                </div>
                
                {/* Score Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    value={editingScore?.matchId === match.id && editingScore.side === 'A' ? editingScore.value : (match.scoreA ?? '')}
                    onChange={(e) => setEditingScore({ matchId: match.id, side: 'A', value: e.target.value })}
                    onBlur={() => { if (editingScore?.matchId === match.id && editingScore.side === 'A') handleScoreChange(match.id, 'A', editingScore.value); }}
                    onFocus={() => setEditingScore({ matchId: match.id, side: 'A', value: String(match.scoreA ?? '') })}
                    style={{ 
                      width: 50, 
                      padding: '6px 8px', 
                      textAlign: 'center', 
                      border: '2px solid #dee2e6', 
                      borderRadius: 6, 
                      fontSize: 16, 
                      fontWeight: 'bold'
                    }}
                  />
                  <span style={{ color: '#adb5bd', fontSize: 18 }}>:</span>
                  <input
                    type="number"
                    min="0"
                    value={editingScore?.matchId === match.id && editingScore.side === 'B' ? editingScore.value : (match.scoreB ?? '')}
                    onChange={(e) => setEditingScore({ matchId: match.id, side: 'B', value: e.target.value })}
                    onBlur={() => { if (editingScore?.matchId === match.id && editingScore.side === 'B') handleScoreChange(match.id, 'B', editingScore.value); }}
                    onFocus={() => setEditingScore({ matchId: match.id, side: 'B', value: String(match.scoreB ?? '') })}
                    style={{ 
                      width: 50, 
                      padding: '6px 8px', 
                      textAlign: 'center', 
                      border: '2px solid #dee2e6', 
                      borderRadius: 6, 
                      fontSize: 16, 
                      fontWeight: 'bold'
                    }}
                  />
                </div>
                
                {/* Team B */}
                <div style={{ flex: 1, fontSize: 14, fontWeight: '500', textAlign: 'right' }}>
                  {getTeamName(match.teamBId)}
                </div>
              </div>
              
              {/* Advance button for KO matches */}
              {(match.phase === 'k.o.' || match.phase === 'K.O.') && match.status === 'abgeschlossen' && (
                <div style={{ marginTop: 8, textAlign: 'right' }}>
                  <button 
                    onClick={() => advanceMatch(match.id)}
                    style={{ 
                      padding: '4px 12px', 
                      background: '#0d6efd', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: 6, 
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    ▶ Nächste Runde fortsetzen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
