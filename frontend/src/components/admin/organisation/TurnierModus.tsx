import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPatch, getBrackets, generateMatchesForYearGroup } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, Tournament, KnockoutBracket, YearGroup } from '../shared';

interface Props {
  tournament: Tournament | null;
  selectedYearGroupId: number | null;
  yearGroups: YearGroup[];
}

const MODI = [
  { value: 'GRUPPEN_KO', label: '🏆 Gruppenphase + K.O.', desc: 'Teams spielen in Gruppen, Top 2 → K.O.-Bracket' },
  { value: 'KO', label: '⚡ Reines K.O.', desc: 'Direktes Ausscheidungssystem (1vs2, 3vs4...)' },
  { value: 'LIGA', label: '📊 Liga/Rundspiel', desc: 'Jeder gegen jeden, Eintafel-Tabelle' },
  { value: 'DOPPEL_KO', label: '🔄 Doppel-K.O.', desc: 'Sieger-Bracket + Verlierer-Runde (Consolation)' }
];

export default function TurnierModus({ tournament, selectedYearGroupId, yearGroups }: Props) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [advancingCount, setAdvancingCount] = useState(tournament?.teamsAdvancingPerGroup || 2);
  const [playoutAll, setPlayoutAll] = useState(tournament?.playoutAllPlacements || false);
  const [thirdPlace, setThirdPlace] = useState(tournament?.thirdPlaceMatch ?? true);
  const [qualRule, setQualRule] = useState(tournament?.qualificationRule || 'BEST_THIRDS');
  const [params, setParams] = useState({
    matchDuration: 15,
    halves: 1,
    halftimeBreak: 5,
    breakDuration: 5
  });

  const { data: brackets = [] } = useQuery<KnockoutBracket[]>({
    queryKey: ['brackets', tournament?.id],
    queryFn: () => getBrackets(tournament?.id ?? null),
    enabled: !!tournament?.id,
    staleTime: 5000
  });

  const handleModeChange = async (modus: string) => {
    if (!tournament) return;
    
    if (!(await modal.confirm({ title: 'Turniermodus ändern', message: `Turnier-Modus auf "${MODI.find(m => m.value === modus)?.label}" ändern?\n\nACHTUNG: Alle bestehenden Spiele und Tabellen für dieses Turnier werden dabei GELÖSCHT!`, variant: 'warning' }))) {
      return;
    }

    setGenerating(true);
    try {
      await apiPatch(`/api/tournaments/${tournament.id}/mode`, { turnierModus: modus });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['brackets'] });
    } catch (err) {
      await modal.alert({ title: 'Fehler', message: 'Fehler beim Ändern des Modus: ' + (err as Error).message });
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (!tournament) return;
    try {
      await apiPatch(`/api/tournaments/${tournament.id}/mode`, { 
        turnierModus: tournament.turnierModus, 
        teamsAdvancingPerGroup: advancingCount,
        playoutAllPlacements: playoutAll,
        thirdPlaceMatch: thirdPlace,
        qualificationRule: qualRule
      });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      modal.alert({ title: 'Erfolg', message: 'Einstellungen gespeichert. Bitte den Spielplan unten neu generieren!' });
    } catch (err) {
      modal.alert({ title: 'Fehler', message: 'Konnte die Anzahl nicht speichern: ' + (err as Error).message });
    }
  };

  const handleGenerateMatches = async () => {
    if (!tournament) return;
    if (!selectedYearGroupId) {
      await modal.alert({ title: 'Hinweis', message: 'Bitte wähle oben einen Jahrgang aus, bevor du den Spielplan generierst.' });
      return;
    }
    
    const ygName = yearGroups.find(y => y.id === selectedYearGroupId)?.name || 'Unbekannt';
    
    if (!(await modal.confirm({ title: 'Spielplan generieren', message: `Spielplan für "${ygName}" mit Modus "${MODI.find(m => m.value === tournament?.turnierModus)?.label}" erstellen?`, variant: 'info' }))) {
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        yearGroupId: selectedYearGroupId,
        ...params
      };
      
      const res = await fetch(`/api/tournaments/${tournament.id}/generate-matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Fehler beim Generieren');
      }
      
      const result = await res.json();
      
      // Speichere die Timing-Parameter im LocalStorage für die Anzeige im Spielplan
      localStorage.setItem(`tournament_${tournament.id}_yearGroup_${selectedYearGroupId}_timing`, JSON.stringify(params));
      
      queryClient.invalidateQueries({ queryKey: ['brackets'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      await modal.alert({ title: 'Erfolg', message: `✅ ${result.message}` });
    } catch (err) {
      await modal.alert({ title: 'Fehler', message: 'Fehler beim Generieren: ' + (err as Error).message });
    } finally {
      setGenerating(false);
    }
  };

  if (!tournament) {
    return (
      <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <p style={{ color: '#dc3545', margin: 0 }}>⚠️ Bitte wähle zuerst ein Turnier aus.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: '600', color: '#212529' }}>⚙️ Turnier-Modus</h3>

      {/* Aktueller Modus */}
      <div style={{ marginBottom: 24, padding: 16, background: '#f8f9fa', borderRadius: 10, border: '1px solid #dee2e6' }}>
        <span style={{ fontSize: 13, color: '#666', fontWeight: 'bold' }}>Aktueller Modus:</span>
        <div style={{ marginTop: 8, padding: '8px 16px', background: '#0d6efd', color: '#fff', borderRadius: 8, display: 'inline-block', fontWeight: '600' }}>
          {MODI.find(m => m.value === tournament.turnierModus)?.label || tournament.turnierModus}
        </div>

        {(tournament.turnierModus === 'GRUPPEN_KO' || tournament.turnierModus === 'KO') && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #dee2e6' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#212529' }}>Details zum K.O.-System</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tournament.turnierModus === 'GRUPPEN_KO' && (
                <div>
                  <label style={{ fontSize: 13, color: '#495057', fontWeight: 'bold', display: 'block', marginBottom: 4 }}>
                    Wie viele Mannschaften kommen pro Gruppe weiter?
                  </label>
                  <input 
                    type="number" min="1" value={advancingCount} 
                    onChange={e => setAdvancingCount(parseInt(e.target.value) || 2)} 
                    style={{ ...inputStyle, width: 100 }} 
                  />
                </div>
              )}

              {tournament.turnierModus === 'GRUPPEN_KO' && (
                <div>
                  <label style={{ fontSize: 13, color: '#495057', fontWeight: 'bold', display: 'block', marginBottom: 4 }}>
                    Übernahmeregel (falls Qualifikanten nicht aufgehen)
                  </label>
                  <select 
                    value={qualRule} 
                    onChange={e => setQualRule(e.target.value)}
                    style={{ ...inputStyle, width: 250 }}
                  >
                    <option value="BEST_THIRDS">Beste Gruppendritte rücken auf</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: 13, color: '#495057', fontWeight: 'bold', display: 'block', marginBottom: 6 }}>
                  Platzierungsspiele
                </label>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={playoutAll} 
                      onChange={e => { setPlayoutAll(e.target.checked); if(e.target.checked) setThirdPlace(true); }}
                    />
                    Alle K.O.-Plätze ausspielen (Trostrunde)
                  </label>
                  <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: playoutAll ? 'not-allowed' : 'pointer', opacity: playoutAll ? 0.5 : 1 }}>
                    <input 
                      type="checkbox" 
                      checked={thirdPlace} 
                      onChange={e => setThirdPlace(e.target.checked)}
                      disabled={playoutAll}
                    />
                    Spiel um Platz 3
                  </label>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <button 
                  onClick={handleUpdateSettings}
                  style={{ ...btnStyle, background: '#198754', color: '#fff', border: 'none' }}
                >Einstellungen speichern</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modus-Auswahl */}
      <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#495057' }}>Neuen Modus wählen:</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {MODI.map(mod => (
          <div key={mod.value} style={{ 
            padding: 16, 
            borderRadius: 10, 
            border: tournament.turnierModus === mod.value ? '3px solid #0d6efd' : '2px solid #dee2e6',
            background: tournament.turnierModus === mod.value ? '#e7f3ff' : '#fff',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: 15, color: '#212529' }}>{mod.label}</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#666' }}>{mod.desc}</p>
              </div>
              {tournament.turnierModus !== mod.value && (
                <button 
                  onClick={() => handleModeChange(mod.value)}
                  disabled={generating}
                  style={{ ...btnStyle, background: '#0d6efd', color: '#fff', border: 'none', fontWeight: '600' }}
                >
                  {generating ? '⏳ Generiere...' : 'Ändern'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Spielplan generieren – Nutzt Kontext-Jahrgang */}
      <div style={{ marginTop: 24, padding: 16, background: selectedYearGroupId ? '#f0fdf4' : '#fff3cd', borderRadius: 10, border: `1px solid ${selectedYearGroupId ? '#86efac' : '#ffc107'}` }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: 15, color: selectedYearGroupId ? '#166534' : '#856404', fontWeight: '600' }}>🎯 Spielplan generieren</h4>
        
        {selectedYearGroupId ? (
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Spieldauer pro Halbzeit (Min)</label>
                <input type="number" min="1" value={params.matchDuration} onChange={e => setParams({...params, matchDuration: parseInt(e.target.value)||1})} style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 6, width: 180 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Anzahl Halbzeiten</label>
                <select value={params.halves} onChange={e => setParams({...params, halves: parseInt(e.target.value)})} style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 6, width: 150 }}>
                  <option value={1}>1 Halbzeit</option>
                  <option value={2}>2 Halbzeiten</option>
                </select>
              </div>
              {params.halves > 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Halbzeitpause (Min)</label>
                  <input type="number" min="0" value={params.halftimeBreak} onChange={e => setParams({...params, halftimeBreak: parseInt(e.target.value)||0})} style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 6, width: 140 }} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Pause nach Spiel (Min)</label>
                <input type="number" min="0" value={params.breakDuration} onChange={e => setParams({...params, breakDuration: parseInt(e.target.value)||0})} style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 6, width: 150 }} />
              </div>
            </div>

            <button
              onClick={handleGenerateMatches}
              disabled={generating}
              style={{ ...btnStyle, background: '#16a34a', color: '#fff', border: 'none', fontWeight: '600', opacity: generating ? 0.7 : 1 }}
            >
              {generating ? '⏳ Generiere...' : '🎯 Spielplan für aktuellen Jahrgang generieren'}
            </button>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: '#856404' }}>
            ⚠️ Bitte wähle oben einen Jahrgang aus, um den Spielplan zu generieren.
          </p>
        )}
      </div>

      {/* Info-Box */}
      <div style={{ marginTop: 24, padding: 16, background: '#fff3cd', borderRadius: 10, border: '1px solid #ffc107' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#856404' }}>
          💡 <strong>Wichtig:</strong> Bevor du den Spielplan generierst, musst du Teams anlegen!
        </p>
        <ol style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 13, color: '#856404' }}>
          <li style={{ marginBottom: 4 }}>📋 <strong>Teilnehmer:</strong> Vereine anklicken. Das System legt automatisch ein erstes Team (z.B. "TSV Holm 1") an. Bei Bedarf kannst du dort noch weitere Teams ergänzen.</li>
          <li style={{ marginBottom: 4 }}>👥 <strong>Gruppen & Teams:</strong> Falls du Gruppen willst → Teams im Dropdown auswählen und den Gruppen zuweisen.</li>
          <li>⚙️ <strong>Hier:</strong> Modus wählen + Spieldauer einstellen + "Spielplan generieren" klicken</li>
        </ol>
      </div>

      {/* Angezeigte Brackets */}
      {brackets.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#495057' }}>🏅 Aktive Brackets</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Runde</th>
                <th style={thStyle}>Spiele</th>
              </tr>
            </thead>
            <tbody>
              {brackets.map(bracket => (
                <tr key={bracket.id}>
                  <td style={tdStyle}>{bracket.name}</td>
                  <td style={tdStyle}>{bracket.runde}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{bracket.matches.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
