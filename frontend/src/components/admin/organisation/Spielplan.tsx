import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPatch } from '../../../api';
import { Match, TimeSlot, Field, Team } from '../shared';

interface Props {
  tournamentId: number | null;
  yearGroupId: number | null;
}

export default function Spielplan({ tournamentId, yearGroupId }: Props) {
  const queryClient = useQueryClient();
  const [editingScore, setEditingScore] = useState<{ matchId: number; side: 'A' | 'B'; value: string } | null>(null);

  // Matches laden (nur für selected yearGroup)
  const { data: matches = [] } = useQuery<Match[]>({
    queryKey: ['matches', tournamentId, yearGroupId],
    queryFn: async () => {
      if (!tournamentId || !yearGroupId) return [];
      const res = await fetch(`/api/matches?tournamentId=${tournamentId}&yearGroupId=${yearGroupId}`);
      return res.json().catch(() => []);
    },
    enabled: !!tournamentId && !!yearGroupId,
  });

  // TimeSlots und Fields für Labels
  const { data: timeSlots = [] } = useQuery<TimeSlot[]>({
    queryKey: ['timeSlots', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [];
      const res = await fetch(`/api/timeslots?tournamentId=${tournamentId}`);
      return res.json().catch(() => []);
    },
    enabled: !!tournamentId,
  });

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
  const { data: teams = {} as Record<number, Team> } = useQuery<Record<number, Team>>({
    queryKey: ['teams-all', tournamentId, yearGroupId],
    queryFn: async () => {
      if (!tournamentId || !yearGroupId) return {};
      const res = await fetch(`/api/teams?tournamentId=${tournamentId}&yearGroupId=${yearGroupId}`);
      const list = await res.json().catch(() => []);
      const map: Record<number, Team> = {};
      for (const t of list) { map[t.id] = t; }
      return map;
    },
    enabled: !!tournamentId && !!yearGroupId,
  });

  // Matches nach Datum und TimeSlot gruppieren
  const matchesByDateAndSlot: Record<string, Match[]> = {};
  for (const m of matches) {
    const slot = timeSlots.find(s => s.id === m.timeSlotId);
    if (!slot) continue;
    const key = `${slot.date}_${slot.startTime}`;
    if (!matchesByDateAndSlot[key]) matchesByDateAndSlot[key] = [];
    matchesByDateAndSlot[key].push(m);
  }

  // Sortierte Keys (Datum + Uhrzeit)
  const sortedKeys = Object.keys(matchesByDateAndSlot).sort((a, b) => {
    return a.localeCompare(b);
  });

  if (!tournamentId || !yearGroupId) {
    return <div style={{ padding: 24, color: '#666' }}>Bitte Turnier und Jahrgang auswählen.</div>;
  }

  const getSlotLabel = (slotId: number | null) => {
    const slot = timeSlots.find(s => s.id === slotId);
    return slot ? `${slot.label || ''} (${slot.startTime}-${slot.endTime})` : 'Keine Zeit';
  };

  const getFieldLabel = (fieldId: number | null) => {
    const field = fields.find(f => f.id === fieldId);
    return field ? field.name : '-';
  };

  const getTeamName = (teamId: number | null) => {
    if (!teamId) return 'TBD';
    const team = teams[teamId];
    return team?.name || 'Unbekannt';
  };

  const handleScoreChange = async (matchId: number, side: 'A' | 'B', value: string) => {
    if (value === '') return;
    const numVal = parseInt(value);
    if (!isNaN(numVal) && numVal >= 0 && tournamentId && yearGroupId) {
      await apiPatch(`/api/matches/${matchId}`, { [`score${side}`]: numVal });
      queryClient.invalidateQueries({ queryKey: ['matches', tournamentId, yearGroupId] });
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
      <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: '600', color: '#212557' }}>⚽ Spielplan</h3>
      
      {sortedKeys.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
          <p style={{ fontSize: 48, margin: '0 0 16px 0' }}>📋</p>
          <p>Noch keine Spiele geplant.</p>
          <p style={{ fontSize: 13 }}>Gehe zu "Modus" und generiere den Spielplan.</p>
        </div>
      ) : (
        sortedKeys.map(key => {
          const [date, time] = key.split('_');
          const slotMatches = matchesByDateAndSlot[key];
          
          return (
            <div key={key} style={{ marginBottom: 32 }}>
              <h4 style={{ 
                margin: '0 0 12px 0', 
                padding: '8px 16px', 
                background: '#f8f9fa', 
                borderRadius: 8,
                fontSize: 15,
                fontWeight: '600',
                color: '#495057'
              }}>
                📅 {date} – ⏰ {time}
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {slotMatches.map(match => (
                  <div key={match.id} style={{ 
                    border: '1px solid #e9ecef', 
                    borderRadius: 12, 
                    padding: 16,
                    background: match.status === 'abgeschlossen' ? '#f8fff8' : match.status === 'in_spiel' ? '#fff8f0' : '#fff'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 12, color: '#666' }}>
                      <span>📍 {getFieldLabel(match.fieldId)}</span>
                      <span>⏱️ {getSlotLabel(match.timeSlotId)}</span>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: 4, 
                        background: match.phase === 'gruppenspiel' ? '#e7f5ff' : match.phase === 'k.o.' ? '#fff3e0' : '#f0f0f0',
                        fontSize: 11,
                        fontWeight: '600'
                      }}>
                        {match.phase === 'gruppenspiel' ? '🏆 Gruppe' : match.phase === 'k.o.' ? '❌ K.O.' : match.status}
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
                    {match.phase === 'k.o.' && match.status === 'abgeschlossen' && (
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
            </div>
          );
        })
      )}
    </div>
  );
}
