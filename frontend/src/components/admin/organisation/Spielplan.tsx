import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiPatch, getAuthToken } from '../../../api';
import { Match, TimeSlot, Field, Team } from '../shared';
import { modal } from '../Modal';

interface Props {
  tournamentId: number | null;
  yearGroupId: number | null;
  phase: 'gruppenphase' | 'ko';
}

export default function Spielplan({ tournamentId, yearGroupId, phase }: Props) {
  const queryClient = useQueryClient();
  const [editingScore, setEditingScore] = useState<{ matchId: number; side: 'A' | 'B'; value: string } | null>(null);

  // Timing-Parameter aus localStorage laden (wird beim Spielplan-Generieren gespeichert)
  const timingParams = React.useMemo(() => {
    if (!tournamentId || !yearGroupId) return { matchDuration: 15, halves: 2, halftimeBreak: 5, breakDuration: 5 };
    try {
      const raw = localStorage.getItem(`tournament_${tournamentId}_yearGroup_${yearGroupId}_timing`);
      return raw ? JSON.parse(raw) : { matchDuration: 15, halves: 2, halftimeBreak: 5, breakDuration: 5 };
    } catch {
      return { matchDuration: 15, halves: 2, halftimeBreak: 5, breakDuration: 5 };
    }
  }, [tournamentId, yearGroupId]);

  // Endzeit berechnen
  const getEndTime = (startTime: Date): string => {
    const totalMinutes = timingParams.matchDuration * timingParams.halves + (timingParams.halves > 1 ? timingParams.halftimeBreak : 0);
    return new Date(startTime.getTime() + totalMinutes * 60000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  // Matches als abgeschlossen markieren/unmarkieren
  const handleToggleCompleted = async (matchId: number) => {
    try {
      await apiPatch(`/api/matches/${matchId}/toggle-completed`, {});
      queryClient.invalidateQueries({ queryKey: ['matches', tournamentId] });
    } catch (e) {
      console.error('Toggle completed fehlgeschlagen:', e);
    }
  };

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

  // Unterscheidung: Gruppenspiele haben Phase die mit "Gruppe" beginnt oder "Liga"
  const isGroupPhase = (phaseVal: string | null) => phaseVal != null && (phaseVal.startsWith('Gruppe') || phaseVal === 'Liga');

  // Nur Gruppenphase-Matches
  const gruppenMatches = allMatchesFiltered.filter(m => isGroupPhase(m.phase));

  // Nur KO-Matches (alles was keine Gruppe/Liga ist)
  const koMatches = phase === 'ko'
    ? allMatchesFiltered.filter(m => !isGroupPhase(m.phase) && m.phase != null)
    : [];

  // Matches nach Status filtern: offen/laufend vs abgeschlossen
  const isCompleted = (m: Match) => m.status === 'abgeschlossen';
  const isOpenOrRunning = (m: Match) => !isCompleted(m);

  const openGruppenMatches = gruppenMatches.filter(isOpenOrRunning).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  const completedGruppenMatches = gruppenMatches.filter(isCompleted).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // KO-Matches nach Stage sortieren (frühe Runden zuerst → Finale immer zuletzt)
  const openKOMatches = koMatches.filter(isOpenOrRunning).sort((a, b) => {
    const stageA = a.stage || 1;
    const stageB = b.stage || 1;
    if (stageA !== stageB) return stageA - stageB;
    return new Date(a.time).getTime() - new Date(b.time).getTime();
  });
  const completedKOMatches = koMatches.filter(isCompleted).sort((a, b) => {
    const stageA = a.stage || 1;
    const stageB = b.stage || 1;
    if (stageA !== stageB) return stageB - stageA;
    return new Date(b.time).getTime() - new Date(a.time).getTime();
  });

  // Fields für Labels
  const { data: fields = [] } = useQuery<Field[]>({
    queryKey: ['fields', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const token = getAuthToken();
      const res = await fetch(`/api/fields?tournamentId=${tournamentId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return res.json().catch(() => []);
    },
    enabled: !!tournamentId,
  });

  // Teams für Namen
  const { data: teamsRaw } = useQuery<Team[]>({
    queryKey: ['teams-all', tournamentId, yearGroupId],
    queryFn: async () => {
      if (!tournamentId || !yearGroupId) return [];
      const token = getAuthToken();
      const res = await fetch(`/api/teams?tournamentId=${tournamentId}&yearGroupId=${yearGroupId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
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
      
      // Zuerst ALLE Teams aus den Matches dieser Gruppe sammeln (auch ungespielte!)
      gruppenMatches.forEach(m => {
        if (m.phase !== groupPhase) return;
        [m.teamAId, m.teamBId].forEach((teamId) => {
          if (!teamId) return;
          let s = stats.get(teamId);
          if (!s) { s = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }; stats.set(teamId, s); }
        });
      });
      
      // Dann nur gespielte Spiele zählen
      gruppenMatches.forEach(m => {
        if (m.phase !== groupPhase) return;
        if (m.scoreA === null || m.scoreB === null) return;
        
        const scoreA = m.scoreA;
        const scoreB = m.scoreB;
        
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

  const getTeamName = (teamId: number | null, placeholder?: string | null) => {
    if (!teamId) return placeholder || 'TBD';
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

  const handleResetMatch = async (matchId: number, matchPhase: string | null) => {
    const confirmed = await modal.confirm({
      title: 'Spiel-Ergebnis zurücksetzen?',
      message: `Das Ergebnis von "${matchPhase || 'Spiel'}" wird gelöscht. Alle daraus resultierenden Änderungen (Aufsteiger, KO-Propagation) werden rückgängig gemacht.`
    });
    if (!confirmed) return;

    try {
      await apiPost(`/api/matches/${matchId}/reset`, {});
      await queryClient.invalidateQueries({ queryKey: ['matches', tournamentId] });
      await modal.alert({ title: 'Erfolg', message: '✅ Spiel-Ergebnis wurde zurückgesetzt.' });
    } catch (e) {
      await modal.alert({ title: 'Fehler', message: 'Reset fehlgeschlagen: ' + (e as Error).message });
    }
  };

  // ============ MATCH CARD RENDERING ============
  const renderMatchCard = (match: Match, index: number) => {
    const isCompleted = match.status === 'abgeschlossen';
    const startTime = new Date(match.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const endTime = getEndTime(new Date(match.time));

    return (
    <div key={match.id} style={{ 
      border: `1px solid ${isCompleted ? '#dee2e6' : '#d1fae5'}`, 
      borderRadius: 8, 
      padding: '8px 12px',
      background: isCompleted ? '#f8f9fa' : match.status === 'gespielt' ? '#fff8f0' : '#fff',
      opacity: isCompleted ? 0.7 : 1,
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }}>
      {/* Links: Nummer + Uhrzeit/Feld */}
      <div style={{ minWidth: 130, flexShrink: 0 }}>
        <span style={{ 
          fontWeight: 'bold',
          color: isCompleted ? '#adb5bd' : '#059669',
          fontSize: 14
        }}>#{index + 1}</span>
        <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>
          🕒 {startTime} – {endTime}
          {' · '}
          📍 {getFieldLabel(match.fieldId)}
        </div>
      </div>

      {/* Phase-Badge */}
      <span style={{ 
        padding: '2px 8px', 
        borderRadius: 4, 
        background: match.status === 'abgeschlossen' ? '#d1fae5' : '#fff3e0',
        fontSize: 11,
        fontWeight: '600',
        flexShrink: 0
      }}>
        {match.runde ? `📋 ${match.runde}` : match.phase}
      </span>

      {/* Team A + Score + Team B – zentrierter Block */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 1 }}>
        {/* Team A – links im zentrierten Block */}
        <div style={{ fontSize: 13, fontWeight: '500', textAlign: 'left', marginRight: 'auto' }}>
          {getTeamName(match.teamAId, match.placeholderA)}
        </div>

        {/* Score – immer mittig */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
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
              width: 36, 
              padding: '4px 2px', 
              textAlign: 'center', 
              border: '1px solid #dee2e6', 
              borderRadius: 4, 
              fontSize: 15, 
              fontWeight: 'bold'
            }}
          />
          <span style={{ color: '#adb5bd' }}>:</span>
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
              width: 36, 
              padding: '4px 2px', 
              textAlign: 'center', 
              border: '1px solid #dee2e6', 
              borderRadius: 4, 
              fontSize: 15, 
              fontWeight: 'bold'
            }}
          />
        </div>

        {/* Team B – rechts im zentrierten Block */}
        <div style={{ fontSize: 13, fontWeight: '500', textAlign: 'right', marginLeft: 'auto' }}>
          {getTeamName(match.teamBId, match.placeholderB)}
        </div>
      </div>

      {/* Reset & Abschließen – ganz rechts */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {match.scoreA !== null && match.scoreB !== null && match.status !== 'abgeschlossen' && (
          <button
            onClick={() => handleResetMatch(match.id, match.phase)}
            title="Spiel-Ergebnis zurücksetzen"
            style={{
              padding: '3px 8px',
              background: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: '500',
              color: '#664d03',
            }}
          >
            ↺ Reset
          </button>
        )}

        {match.scoreA !== null && match.scoreB !== null && (
          <button
            onClick={() => handleToggleCompleted(match.id)}
            title={match.status === 'abgeschlossen' ? 'Als offen markieren' : 'Als abgeschlossen markieren'}
            style={{
              padding: '2px 6px',
              background: match.status === 'abgeschlossen' ? '#e9ecef' : '#d1fae5',
              border: `1px solid ${match.status === 'abgeschlossen' ? '#adb5bd' : '#86efac'}`,
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
              color: match.status === 'abgeschlossen' ? '#6c757d' : '#059669',
            }}
          >
            {match.status === 'abgeschlossen' ? '○ Wieder öffnen' : '✓ Abschließen'}
          </button>
        )}
      </div>
    </div>
    );
  };

  const advanceMatch = async () => {
    try {
      if (!tournamentId || !yearGroupId) {
        await modal.alert({ title: 'Hinweis', message: 'Bitte Turnier und Jahrgang auswählen' });
        return;
      }
      // Teams aus Gruppenphase in KO-Spiele zuweisen
      const result = await apiPost('/api/matches/assign-ko-teams', {
        tournamentId,
        yearGroupId
      });
      // Nach Zuweisung alle KO-Matches neu laden
      await queryClient.invalidateQueries({ queryKey: ['matches', tournamentId] });
      await modal.alert({ title: 'Erfolg', message: '✅ Teams erfolgreich aus der Gruppenphase übernommen!' });
    } catch (e) {
      await modal.alert({ title: 'Fehler', message: 'Fehler beim Fortsetzen: ' + (e as Error).message });
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

            {/* Offene/laufende Spiele */}
            <div style={{ marginTop: 24 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: '600', color: '#212557' }}>📅 Offene & laufende Spiele</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {openGruppenMatches.map((match, i) => renderMatchCard(match, i))}
              </div>
            </div>

            {/* Abgeschlossene Spiele */}
            {completedGruppenMatches.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: '600', color: '#6c757d' }}>🔘 Abgeschlossene Spiele</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {completedGruppenMatches.map((match, i) => renderMatchCard(match, i))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ============ KO-PHASE ============
  // Turnier-Info laden für Modus-Prüfung
  const { data: currentTournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return null;
      const token = getAuthToken();
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return res.json().catch(() => null);
    },
    enabled: !!tournamentId,
  });

  // Prüfen ob GRUPPEN_KO Modus (hat Gruppenspiele)
  const isGruppenKo = currentTournament?.turnierModus === 'GRUPPEN_KO';
  const hasPlayedGroupMatches = isGruppenKo && gruppenMatches.some(m => m.scoreA !== null && m.scoreB !== null);

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: '600', color: '#212557' }}>🏆 KO-Phase</h3>
      
      {/* Teams aus Gruppenphase übernehmen – nur bei GRUPPEN_KO */}
      {isGruppenKo && hasPlayedGroupMatches && (
        <div style={{ marginBottom: 16 }}>
        <button
          onClick={advanceMatch}
          style={{
            padding: '8px 20px',
            background: '#198754',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: '600'
          }}
        >
          📋 Teams aus Gruppenphase übernehmen
        </button>
      </div>
      )}
      
      {koMatches.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
          <p style={{ fontSize: 48, margin: '0 0 16px 0' }}>🏆</p>
          <p>Noch keine KO-Spiele geplant.</p>
          {isGruppenKo && hasPlayedGroupMatches ? (
            <button
              onClick={async () => {
                if (!tournamentId || !yearGroupId) return;
                try {
                  await apiPost(`/api/tournaments/${tournamentId}/generate-ko-from-gruppen`, {
                    yearGroupId,
                    matchDuration: 15,
                    halves: 2,
                    halftimeBreak: 5,
                    breakDuration: 5
                  });
                  queryClient.invalidateQueries({ queryKey: ['matches', tournamentId] });
                } catch (e) {
                  await modal.alert({ title: 'Fehler', message: 'KO-Phase konnte nicht generiert werden: ' + (e as Error).message });
                }
              }}
              style={{
                padding: '10px 24px',
                background: '#198754',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: '600'
              }}
            >
              🎯 KO-Phase generieren
            </button>
          ) : isGruppenKo ? (
            <p style={{ fontSize: 13 }}>Trage zuerst Ergebnisse in die Gruppenspiele ein.</p>
          ) : (
            <button
              onClick={async () => {
                if (!tournamentId || !yearGroupId) return;
                try {
                  await apiPost(`/api/tournaments/${tournamentId}/generate-ko-only`, {
                    yearGroupId,
                    matchDuration: 15,
                    halves: 2,
                    halftimeBreak: 5,
                    breakDuration: 5
                  });
                  queryClient.invalidateQueries({ queryKey: ['matches', tournamentId] });
                } catch (e) {
                  await modal.alert({ title: 'Fehler', message: 'Spielplan konnte nicht generiert werden: ' + (e as Error).message });
                }
              }}
              style={{
                padding: '10px 24px',
                background: '#198754',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: '600'
              }}
            >
              🎯 Spielplan generieren
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Offene/laufende KO-Spiele */}
          {openKOMatches.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: '600', color: '#212557' }}>📅 Offene & laufende KO-Spiele</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {openKOMatches.map((match, i) => renderMatchCard(match, i))}
              </div>
            </div>
          )}

          {/* Abgeschlossene KO-Spiele */}
          {completedKOMatches.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: '600', color: '#6c757d' }}>🔘 Abgeschlossene KO-Spiele</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {completedKOMatches.map((match, i) => renderMatchCard(match, i))}
              </div>
            </div>
          )}

          {/* Neu generieren Button */}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <button
              onClick={async () => {
                if (!tournamentId || !yearGroupId) return;
                const confirmed = await modal.confirm({
                  title: 'KO-Phase neu generieren?',
                  message: 'Alle bestehenden KO-Spiele werden gelöscht und neu erstellt. Gruppenspiele bleiben erhalten.',
                  variant: 'warning'
                });
                if (!confirmed) return;
                try {
                  await apiPost(`/api/tournaments/${tournamentId}/generate-ko-from-gruppen`, {
                    yearGroupId,
                    matchDuration: 15,
                    halves: 2,
                    halftimeBreak: 5,
                    breakDuration: 5
                  });
                  queryClient.invalidateQueries({ queryKey: ['matches', tournamentId] });
                } catch (e) {
                  await modal.alert({ title: 'Fehler', message: 'KO-Phase konnte nicht generiert werden: ' + (e as Error).message });
                }
              }}
              style={{
                padding: '10px 24px',
                background: '#ffc107',
                color: '#000',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: '600'
              }}
            >
              🔄 KO-Phase neu generieren
            </button>
          </div>
        </>
      )}
    </div>
  );
}
