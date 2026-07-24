import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPost, apiPatch } from '../../../api';
import { btnStyle, inputStyle, Tournament, YearGroup } from '../shared';

interface Props {
  tournament: Tournament | null;
  selectedYearGroupId: number | null;
  yearGroups: YearGroup[];
}

const MODI = [
  { value: 'GRUPPEN_KO', label: '🏆 Gruppenphase + K.O.' },
  { value: 'KO', label: '⚡ Reines K.O.' },
  { value: 'LIGA', label: '📊 Liga/Rundspiel' }
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

  const handleModeChange = async (modus: string) => {
    if (!tournament) return;
    
    if (!(await modal.confirm({ title: 'Turniermodus ändern', message: `Turnier-Modus auf "${MODI.find(m => m.value === modus)?.label}" ändern?\n\nACHTUNG: Alle bestehenden Spiele und Tabellen für dieses Turnier werden dabei GELÖSCHT!`, variant: 'warning' }))) {
      return;
    }

    setGenerating(true);
    try {
      await apiPatch(`/api/tournaments/${tournament.id}/mode`, { turnierModus: modus });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
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
      
      const result = await apiPost(`/api/tournaments/${tournament.id}/generate-matches`, payload);
      
      // Speichere die Timing-Parameter im LocalStorage für die Anzeige im Spielplan
      localStorage.setItem(`tournament_${tournament.id}_yearGroup_${selectedYearGroupId}_timing`, JSON.stringify(params));
      
      queryClient.invalidateQueries({ queryKey: ['matches'] });
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

      {/* Wichtige Hinweise – ganz nach oben! */}
      <div style={{ marginBottom: 24, padding: 16, background: '#fff8e1', borderRadius: 10, border: '1px solid #ffe082' }}>
        <p style={{ margin: '0 0 12px 0', fontSize: 14, color: '#7c5e00', fontWeight: 'bold' }}>💡 Wichtig: Bevor du den Spielplan generierst, musst du folgende Dinge vorbereiten:</p>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#6b4f00' }}>
          <li style={{ marginBottom: 6 }}>🏟️ <strong>Spielfelder anlegen:</strong> Gehe zum Tab "Spielfelder" und lege mindestens so viele Spielfelder an, wie parallel gespielt werden sollen.</li>
          <li style={{ marginBottom: 6 }}>📋 <strong>Teilnehmer:</strong> Gehe zum Tab "Teilnehmer" und klicke die Vereine an, die am Turnier teilnehmen sollen. Für jeden Verein wird automatisch ein Team angelegt (z.B. "TSV Holm 1"). Dort kannst du auch weitere Teams ergänzen.</li>
          <li style={{ marginBottom: 6 }}>👥 <strong>Gruppen & Teams:</strong> Falls du Gruppen willst → Teams im Dropdown auswählen und den Gruppen zuweisen.</li>
          <li>⚙️ <strong>Hier:</strong> Modus wählen + Spieldauer einstellen + "Spielplan generieren" klicken</li>
        </ol>
      </div>

      {/* Modus-Auswahl – aktiver Modus mit Details */}
      <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#495057' }}>Turnier-Modus wählen:</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {MODI.map(mod => {
          const isActive = tournament.turnierModus === mod.value;
          return (
            <div key={mod.value} style={{ 
              padding: 16, 
              borderRadius: 10, 
              border: isActive ? '3px solid #0d6efd' : '2px solid #dee2e6',
              background: isActive ? '#e7f3ff' : '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isActive ? 16 : 0 }}>
                <div>
                  <strong style={{ fontSize: 15, color: '#212529' }}>{mod.label}</strong>
                  {isActive && <span style={{ marginLeft: 8, padding: '2px 8px', background: '#0d6efd', color: '#fff', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>AKTIV</span>}
                </div>
                {isActive ? (
                  <span style={{ fontSize: 13, color: '#0d6efd', fontWeight: 500 }}>✓ Gewählt</span>
                ) : (
                  <button 
                    onClick={() => handleModeChange(mod.value)}
                    disabled={generating}
                    style={{ ...btnStyle, background: '#0d6efd', color: '#fff', border: 'none' }}
                  >
                    {generating ? '⏳ Generiere...' : 'Ändern'}
                  </button>
                )}
              </div>

              {/* Details nur für aktiven Modus */}
              {isActive && (tournament.turnierModus === 'GRUPPEN_KO' || tournament.turnierModus === 'KO') && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {tournament.turnierModus === 'GRUPPEN_KO' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label style={{ fontSize: 13, color: '#495057', fontWeight: 600, whiteSpace: 'nowrap' }}>Teams die weiterkommen:</label>
                      <input 
                        type="number" min="1" value={advancingCount} 
                        onChange={e => setAdvancingCount(parseInt(e.target.value) || 2)} 
                        style={{ ...inputStyle, width: 80 }} 
                      />
                    </div>
                  )}

                  {tournament.turnierModus === 'GRUPPEN_KO' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <label style={{ fontSize: 13, color: '#495057', fontWeight: 600 }}>Übernahme:</label>
                      <select 
                        value={qualRule} 
                        onChange={e => setQualRule(e.target.value)}
                        style={{ ...inputStyle }}
                      >
                        <option value="BEST_THIRDS">Beste Gruppendritte rücken auf</option>
                        <option value="REPLACEMENTS">Nachrücker</option>
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                    <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={playoutAll} 
                        onChange={e => { setPlayoutAll(e.target.checked); if(e.target.checked) setThirdPlace(true); }}
                      />
                      Alle K.O.-Plätze ausspielen
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
              )}
            </div>
          );
        })}
      </div>

      {/* Spielzeiten konfigurieren */}
      <div style={{ marginTop: 24, padding: 16, background: '#f8f9fa', borderRadius: 10, border: '1px solid #dee2e6' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#495057', fontWeight: '600' }}>⏱️ Spielzeiten konfigurieren</h4>
        
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
      </div>

      {/* Großer Spielplan-generieren Button */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        {selectedYearGroupId ? (
          <button
            onClick={handleGenerateMatches}
            disabled={generating}
            style={{ ...btnStyle, background: '#16a34a', color: '#fff', border: 'none', fontSize: 18, fontWeight: 700, padding: '16px 40px', minWidth: 280 }}
          >
            {generating ? '⏳ Generiere...' : '🎯 Spielplan generieren'}
          </button>
        ) : (
          <p style={{ margin: 0, fontSize: 14, color: '#856404' }}>
            ⚠️ Bitte wähle oben einen Jahrgang aus.
          </p>
        )}
      </div>
    </div>
  );
}
