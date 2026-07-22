import { useState, useEffect } from 'react';

interface Tournament {
  id: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

interface Group {
  id: number;
  name: string;
  tournamentId: number;
  teams: Team[];
}

interface Team {
  id: number;
  name: string;
  groupId: number;
  goalsFor: number;
  goalsAgainst: number;
}

export default function TournamentView() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<number | null>(null);
  const [newTournament, setNewTournament] = useState({ name: '', startDate: '', endDate: '' });
  const [newGroupName, setNewGroupName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/tournaments')
      .then(r => r.json())
      .then(setTournaments);
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetch(`/api/groups/${selectedTournament}`)
        .then(r => r.json())
        .then(setGroups);
    }
  }, [selectedTournament]);

  const createTournament = async () => {
    if (!newTournament.name || !newTournament.startDate || !newTournament.endDate) return;
    await fetch('/api/tournaments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTournament),
    });
    setTournaments(await (await fetch('/api/tournaments')).json());
    setNewTournament({ name: '', startDate: '', endDate: '' });
  };

  const createGroup = async () => {
    if (!newGroupName || !selectedTournament) return;
    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newGroupName, tournamentId: selectedTournament }),
    });
    setGroups(await (await fetch(`/api/groups/${selectedTournament}`)).json());
    setNewGroupName('');
  };

  const createTeam = async () => {
    if (!newTeamName || !selectedGroup) return;
    await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTeamName, groupId: selectedGroup }),
    });
    setGroups(await (await fetch(`/api/groups/${selectedTournament}`)).json());
    setNewTeamName('');
  };

  const deleteTournament = async (id: number) => {
    if (!confirm('Turnier wirklich löschen?')) return;
    await fetch(`/api/tournaments/${id}`, { method: 'DELETE' });
    setTournaments(await (await fetch('/api/tournaments')).json());
    if (selectedTournament === id) setSelectedTournament(null);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      <h2>⚽ Turnier-Planung</h2>

      {/* Neues Turnier */}
      <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>🆕 Neues Turnier</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="Turnier-Name"
            value={newTournament.name}
            onChange={e => setNewTournament({ ...newTournament, name: e.target.value })}
            style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: 4, width: 200 }}
          />
          <input
            type="date"
            value={newTournament.startDate}
            onChange={e => setNewTournament({ ...newTournament, startDate: e.target.value })}
            style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: 4 }}
          />
          <input
            type="date"
            value={newTournament.endDate}
            onChange={e => setNewTournament({ ...newTournament, endDate: e.target.value })}
            style={{ padding: '8px 12px', border: '1px solid #ced4da', borderRadius: 4 }}
          />
          <button
            onClick={createTournament}
            disabled={!newTournament.name || !newTournament.startDate || !newTournament.endDate}
            style={{
              padding: '8px 16px',
              background: '#0d6efd',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: newTournament.name && newTournament.startDate && newTournament.endDate ? 'pointer' : 'not-allowed',
              fontWeight: 'bold'
            }}
          >
            + Turnier anlegen
          </button>
        </div>
      </div>

      {/* Turnier-Liste */}
      <h3>📋 Turniere ({tournaments.length})</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr>
            <th style={{ padding: '10px', border: '1px solid #dee2e6', background: '#f8f9fa' }}>Name</th>
            <th style={{ padding: '10px', border: '1px solid #dee2e6', background: '#f8f9fa' }}>Zeitraum</th>
            <th style={{ padding: '10px', border: '1px solid #dee2e6', background: '#f8f9fa' }}>Gruppen</th>
            <th style={{ padding: '10px', border: '1px solid #dee2e6', background: '#f8f9fa' }}>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map(t => (
            <tr key={t.id} style={{ background: selectedTournament === t.id ? '#e7f3ff' : 'transparent', cursor: 'pointer' }}
                onClick={() => setSelectedTournament(t.id)}>
              <td style={{ padding: '10px', border: '1px solid #dee2e6', fontWeight: 'bold' }}>{t.name}</td>
              <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                {new Date(t.startDate).toLocaleDateString('de-DE')} → {new Date(t.endDate).toLocaleDateString('de-DE')}
              </td>
              <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{groups.filter(g => g.tournamentId === t.id).length}</td>
              <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                <button onClick={e => { e.stopPropagation(); deleteTournament(t.id); }}
                  style={{ padding: '4px 8px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Gruppen-Verwaltung */}
      {selectedTournament && (
        <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>📊 Gruppen des Turniers</h3>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                placeholder="Neue Gruppe"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 4 }}
              />
              <button onClick={createGroup} style={{ padding: '6px 12px', background: '#198754', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                + Gruppe
              </button>
            </div>
          </div>

          {groups.filter(g => g.tournamentId === selectedTournament).map(group => (
            <div key={group.id} style={{ marginBottom: 16, border: '1px solid #dee2e6', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ background: '#e9ecef', padding: '10px 14px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                <span>📦 {group.name} ({group.teams.length} Teams)</span>
                <button onClick={() => setSelectedGroup(selectedGroup === group.id ? null : group.id)}
                  style={{ background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', padding: '4px 10px' }}>
                  {selectedGroup === group.id ? '▲' : '▼'}
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>Team</th>
                    <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center' }}>Tore</th>
                  </tr>
                </thead>
                <tbody>
                  {group.teams.map(team => (
                    <tr key={team.id}>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6' }}>{team.name}</td>
                      <td style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'center' }}>{team.goalsFor}:{team.goalsAgainst}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedGroup === group.id && (
                <div style={{ padding: 10, background: '#f8f9fa', borderTop: '1px solid #dee2e6' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      placeholder="Neues Team"
                      value={newTeamName}
                      onChange={e => setNewTeamName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') createTeam(); }}
                      style={{ padding: '6px 10px', border: '1px solid #ced4da', borderRadius: 4, flex: 1 }}
                    />
                    <button onClick={createTeam} style={{ padding: '6px 12px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                      + Team
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
