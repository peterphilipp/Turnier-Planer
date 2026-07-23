import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFields, apiPost, apiPatch, apiDelete } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, Field } from '../shared';

interface Props {
  tournamentId: number | null;
  yearGroupId: number | null;
}

export default function Felder({ tournamentId, yearGroupId }: Props) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: 'Feld 1', status: 'verfügbar' });

  const { data: fields = [] } = useQuery<Field[]>({
    queryKey: ['fields', tournamentId, yearGroupId],
    queryFn: () => {
      let url = `/api/fields?tournamentId=${tournamentId}`;
      if (yearGroupId) url += `&yearGroupId=${yearGroupId}`;
      return fetch(url).then(r => r.json()).catch(() => []);
    },
    enabled: !!tournamentId,
  });

  const handleSave = async () => {
    if (!tournamentId || !form.name.trim()) return alert('Feldname erforderlich!');
    
    await apiPost('/api/fields', { ...form, tournamentId, yearGroupId: yearGroupId || null });
    queryClient.invalidateQueries({ queryKey: ['fields'] });
    setShowForm(false);
    setForm({ name: 'Feld 1', status: 'verfügbar' });
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    await apiPatch(`/api/fields/${id}`, { status: newStatus });
    queryClient.invalidateQueries({ queryKey: ['fields'] });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Feld löschen? Alle zugewiesenen Spiele gehen verloren.')) return;
    await apiDelete(`/api/fields/${id}`);
    queryClient.invalidateQueries({ queryKey: ['fields'] });
  };

  const statusColors: Record<string, string> = {
    'verfügbar': '#d4edda',
    'in_nutzung': '#fff3cd',
    'wartung': '#f8d7da'
  };

  const statusLabels: Record<string, string> = {
    'verfügbar': '✅ Verfügbar',
    'in_nutzung': '🔶 In Nutzung',
    'wartung': '🔴 Wartung'
  };

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
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>⚽ Spielfelder</h3>
        <button onClick={() => setShowForm(!showForm)} style={{ ...btnStyle, background: '#0d6efd', color: '#fff', border: 'none', fontWeight: '600' }}>
          {showForm ? '✕ Abbrechen' : '+ Neues Feld'}
        </button>
      </div>

      {/* Formular */}
      {showForm && (
        <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 12, marginBottom: 20, border: '1px solid #dee2e6' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 15, color: '#495057' }}>Neues Spielfeld</h4>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Feldname</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })} 
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="z.B. Feld 1, Hauptfeld..." 
                style={{ ...inputStyle, width: 200 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Status</label>
              <select 
                value={form.status} 
                onChange={e => setForm({ ...form, status: e.target.value })} 
                style={{ ...inputStyle, width: 180 }}
              >
                <option value="verfügbar">✅ Verfügbar</option>
                <option value="in_nutzung">🔶 In Nutzung</option>
                <option value="wartung">🔴 Wartung</option>
              </select>
            </div>
            <button onClick={handleSave} style={{ ...btnStyle, background: '#28a745', color: '#fff', border: 'none', fontWeight: '600' }}>✓ Speichern</button>
          </div>
        </div>
      )}

      {/* Felder-Liste */}
      {fields.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
          Keine Spielfelder angelegt. Klicke "+ Neues Feld" um Spielfelder zu erstellen.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Feldname</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, width: 150 }}>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, idx) => (
              <tr key={field.id} style={{ background: statusColors[field.status] || '#fff' }}>
                <td style={{ ...tdStyle, fontWeight: 'bold', color: '#6c757d' }}>{idx + 1}</td>
                <td style={tdStyle}>{field.name}</td>
                <td style={tdStyle}>
                  <select 
                    value={field.status} 
                    onChange={e => handleStatusChange(field.id, e.target.value)}
                    style={{ ...inputStyle, fontSize: 13 }}
                  >
                    <option value="verfügbar">✅ Verfügbar</option>
                    <option value="in_nutzung">🔶 In Nutzung</option>
                    <option value="wartung">🔴 Wartung</option>
                  </select>
                </td>
                <td style={tdStyle}>
                  <button 
                    onClick={() => handleDelete(field.id)} 
                    style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}
                  >🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Info-Box */}
      <div style={{ marginTop: 24, padding: 16, background: '#f8f9fa', borderRadius: 10, border: '1px solid #dee2e6' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
          💡 <strong>Tipp:</strong> Lege alle Spielfelder an die für das Turnier zur Verfügung stehen. 
          Der Status kann während des Turniers geändert werden (z.B. bei Regen "Wartung").
        </p>
      </div>
    </div>
  );
}
