import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPatch } from '../../../api';
import { Match, TimeSlot, Field, Team } from '../shared';

interface Props {
  tournamentId: number | null;
  yearGroupId: number | null;
  phase: 'gruppenphase' | 'ko';
}

export default function Spielplan({ tournamentId, yearGroupId, phase }: Props) {
  const queryClient = useQueryClient();
  const [editingScore, setEditingScore] = useState<{ matchId: number; side: 'A' | 'B'; value: string } | null>(null);

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
  const allMatchesFiltered = Array.isArray(allMatches) ? (
    yearGroupId
      ? allMatches.filter(m => m.yearGroupId === yearGroupId)
      : allMatches
  ) : [];

  console.log('DEBUG Spielplan:', { tournamentId, yearGroupId, phase, total: allMatchesFiltered.length });
  if (allMatchesFiltered.length > 0) {
    const phases = Array.from(new Set(allMatchesFiltered.map(m => m.phase)));
    console.log('DEBUG Phasen:', phases);
  }

  // Unterscheidung: Gruppenspiele haben Phase die mit "Gruppe" beginnt oder "Liga"
  const isGroupPhase = (phaseVal: string | null) => phaseVal != null && (phaseVal.startsWith('Gruppe') || phaseVal === 'Liga');

  // Nur Gruppenphase-Matches
  const gruppenMatches = phase === 'gruppenphase' 
    ? allMatchesFiltered.filter(m => isGroupPhase(m.phase))
    : [];

  // Nur KO-Matches (alles was keine Gruppe/Liga ist)
  const koMatches = phase === 'ko'
    ? allMatchesFiltered.filter(m => !isGroupPhase(m.phase) && m.phase != null)
    : [];

  console.log('DEBUG Ergebnis:', { gruppen: gruppenMatches.length, ko: koMatches.length });

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

  // Aufsteiger-Anzahl pro Gruppe (Standard: Top 2)
  const advancingPerGroup = 2;

  // Standings client-seitig berechnen pro Gruppe
  interface GroupStanding {
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
    if (gruppenMatches.length === 0) return [];
    
    // Alle Gruppen-Phasen sammeln (z.B. "Gruppe A", "Liga")
    const phases = Array.from(new Set(gruppenMatches.map(m => m.phase).filter(Boolean)));
    
    const result: GroupStanding[] = [];
    
    for (const groupPhase of phases) {
      // Stats pro Team berechnen
      const stats = new Map<number, { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number }>();
      
      gruppenMatches.forEach(m => {
        if (m.phase !== groupPhase) return;
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
          groupName: groupPhase || 'Liga',
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
  }, [gruppenMatches, teamsMap]);

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
    if (value === '' || value === '-') return;
    const numVal = parseInt(value);
    if (!isNaN(numVal) && numVal >= 0 && tournamentId) {
      try {
        await apiPatch(`/api/matches/${matchId}`, { 
          [`score${side}`]: numVal,
          status: 'gespielt'
        });
        queryClient.invalidateQueries({ queryKey: ['matches', tournamentId] });
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
      queryClient.invalidateQueries({ queryKey: ['matches', tournamentId] });
    } catch (e) {
      alert('Fehler beim Fortsetzen: ' + (e as Error).message);
    }
  };

  // ============ GRUPPHENPHASE ============
  if (phase === 'gruppenphase') {
    return (
      <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: '600', color: '#212557' }}>📊 Gruppenphase</h3>
        
        {gruppenMatches.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
            <p style={{ fontSize: 48, margin: '0 0 16px 0' }}>📋</p>
            <p>Noch keine Gruppenspiele geplant.</p>
            <p style={{ fontSize: 13 }}>Gehe zu "Modus" und generiere den Spielplan.</p>
          </div>
        ) : (
          <>
            {/* Tabellen pro Gruppe */}
            {groups.map((group) => {
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
                          // Aufsteiger-Farbe (Top advancingPerGroup)
                          const isAdvancing = idx < advancingPerGroup && sortedTeams.length > advancingPerGroup;
                          
                          return (
                            <tr key={entry.teamId} style={{
                              background: isAdvancing ? '#d4edda' : (idx % 2 === 0 ? '#fff' : '#f8f9fa'),
                              borderBottom: '1px solid #e9ecef',
                              opacity: isAdvancing ? 1 : 0.7
                            }}>
                              <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', color: idx < advancingPerGroup ? '#198754' : (idx < 3 ? '#0d6efd' : '#495057') }}>
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

            {/* Legende */}
            <div style={{ marginTop: 16, padding: '8px 12px', background: '#f8f9fa', borderRadius: 8, fontSize: 12, color: '#666' }}>
              🟩 = Aufsteiger in die KO-Phase (Top {advancingPerGroup})
            </div>

            {/* Gruppenspiele */}
            <h4 style={{ margin: '24px 0 8px 0', fontSize: 15, fontWeight: '600', color: '#212557' }}>📅 Spiele</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {gruppenMatches.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).map(match => (
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
                      background: '#e7f5ff',
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
                    
                    {/* Score Input - nur Zahlen */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min="0"
                        value={editingScore?.matchId === match.id && editingScore.side === 'A' ? editingScore.value : (match.scoreA ?? '')}
                        onChange={(e) => {
                          // Nur Zahlen erlauben
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setEditingScore({ matchId: match.id, side: 'A', value: val });
                        }}
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
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min="0"
                        value={editingScore?.matchId === match.id && editingScore.side === 'B' ? editingScore.value : (match.scoreB ?? '')}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setEditingScore({ matchId: match.id, side: 'B', value: val });
                        }}
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
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ============ KO-PHASE ============
  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: '600', color: '#212557' }}>🏆 KO-Phase</h3>
      
      {koMatches.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
          <p style={{ fontSize: 48, margin: '0 0 16px 0' }}>🏆</p>
          <p>Noch keine KO-Spiele geplant.</p>
          <p style={{ fontSize: 13 }}>Generiere die KO-Phase im "Modus"-Tab nach Abschluss der Gruppenphase.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {koMatches.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()).map(match => (
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
                  background: '#fff3e0',
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
                
                {/* Score Input - nur Zahlen */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    value={editingScore?.matchId === match.id && editingScore.side === 'A' ? editingScore.value : (match.scoreA ?? '')}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEditingScore({ matchId: match.id, side: 'A', value: val });
                    }}
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="0"
                    value={editingScore?.matchId === match.id && editingScore.side === 'B' ? editingScore.value : (match.scoreB ?? '')}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEditingScore({ matchId: match.id, side: 'B', value: val });
                    }}
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
              {match.status === 'abgeschlossen' && (
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
