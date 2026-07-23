import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiPatch, getBrackets, generateMatchesForYearGroup, getYearGroups } from '../../../api';
import { tdStyle, thStyle, btnStyle, Tournament, KnockoutBracket, YearGroup } from '../shared';

interface Props {
  tournament: Tournament | null;
}

const MODI = [
  { value: 'GRUPPEN_KO', label: '🏆 Gruppenphase + K.O.', desc: 'Teams spielen in Gruppen, Top 2 → K.O.-Bracket' },
  { value: 'KO', label: '⚡ Reines K.O.', desc: 'Direktes Ausscheidungssystem (1vs2, 3vs4...)' },
  { value: 'LIGA', label: '📊 Liga/Rundspiel', desc: 'Jeder gegen jeden, Eintafel-Tabelle' },
  { value: 'DOPPEL_KO', label: '🔄 Doppel-K.O.', desc: 'Sieger-Bracket + Verlierer-Runde (Consolation)' }
];

export default function TurnierModus({ tournament }: Props) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [selectedYearGroupId, setSelectedYearGroupId] = useState<number | null>(null);

  const { data: yearGroups = [] } = useQuery<YearGroup[]>({
    queryKey: ['year-groups'],
    queryFn: getYearGroups,
    staleTime: 10000
  });

  const { data: brackets = [] } = useQuery<KnockoutBracket[]>({
    queryKey: ['brackets', tournament?.id],
    queryFn: () => getBrackets(tournament?.id ?? null),
    enabled: !!tournament?.id,
    staleTime: 5000
  });

  const handleModeChange = async (modus: string) => {
    if (!tournament) return;
    
    if (!(await modal.confirm({ title: 'Turniermodus ändern', message: `Turnier-Modus auf "${MODI.find(m => m.value === modus)?.label}" ändern?

Alle bestehenden Spiele und Tabellen werden dabei NICHT gelöscht, aber neu generiert.`, variant: 'warning' }))) {
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

      {/* Spielplan generieren für Jahrgang */}
      {tournament?.turnierModus && (
        <div style={{ marginTop: 24, padding: 16, background: '#f0fdf4', borderRadius: 10, border: '1px solid #86efac' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#166534', fontWeight: '600' }}>🎯 Spielplan generieren</h4>
          
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, color: '#166534', fontWeight: '500' }}>Jahrgang:</label>
            <select
              value={selectedYearGroupId || ''}
              onChange={e => setSelectedYearGroupId(e.target.value ? parseInt(e.target.value) : null)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #86efac', fontSize: 14, minWidth: 180 }}
            >
              <option value="">-- Jahrgang wählen --</option>
              {yearGroups.map(yg => (
                <option key={yg.id} value={yg.id}>{yg.name}</option>
              ))}
            </select>
            
            <button
              onClick={async () => {
                if (!selectedYearGroupId) {
                  await modal.alert({ title: 'Hinweis', message: 'Bitte wähle einen Jahrgang aus.' });
                  return;
                }
                if (!(await modal.confirm({ title: 'Spielplan generieren', message: `Spielplan für "${yearGroups.find(y => y.id === selectedYearGroupId)?.name}" mit Modus "${MODI.find(m => m.value === tournament.turnierModus)?.label}" erstellen?`, variant: 'info' }))) {
                  return;
                }
                setGenerating(true);
                try {
                  const result = await generateMatchesForYearGroup(tournament.id, selectedYearGroupId);
                  queryClient.invalidateQueries({ queryKey: ['brackets'] });
                  await modal.alert({ title: 'Erfolg', message: `✅ ${result.message}` });
                } catch (err) {
                  await modal.alert({ title: 'Fehler', message: 'Fehler beim Generieren: ' + (err as Error).message });
                } finally {
                  setGenerating(false);
                }
              }}
              disabled={!selectedYearGroupId || generating}
              style={{ ...btnStyle, background: '#16a34a', color: '#fff', border: 'none', fontWeight: '600', opacity: (!selectedYearGroupId || generating) ? 0.5 : 1 }}
            >
              {generating ? '⏳ Generiere...' : '🎯 Spielplan generieren'}
            </button>
          </div>
        </div>
      )}

      {/* Info-Box */}
      <div style={{ padding: 16, background: '#fff3cd', borderRadius: 10, border: '1px solid #ffc107' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#856404' }}>
          💡 <strong>Hinweis:</strong> Beim Ändern des Modus werden automatisch Paarungen generiert (wenn Teams vorhanden). 
          Bestehende Spiele und Tabellen bleiben erhalten. Du kannst manuell nachträglich Änderungen vornehmen.
        </p>
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
