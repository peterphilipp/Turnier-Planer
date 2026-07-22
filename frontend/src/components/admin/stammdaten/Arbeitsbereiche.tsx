import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getArbeitsbereiche, apiPost, apiPatch, apiDelete } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, Arbeitsbereich } from '../shared';

const emojiList = ['🏪', '🍳', '🔥', '🎪', '🎯', '⚽', '🍰', '☕', '🥤', '🏆', '📦', '🗑️', '💰', '🎁', '🎵', '🎠', '🧸', '🎴', '🎲', '🏅', '🥇', '🎖️', '📋', '✅', '❌', '⏰', '📍', '📞', '🔧', '📢', '📣', '📝'];

export default function Arbeitsbereiche({ adminPrimary }: { adminPrimary: string }) {
  const queryClient = useQueryClient();
  const { data: arbeitsbereiche = [] } = useQuery<Arbeitsbereich[]>({ queryKey: ['arbeitsbereiche'], queryFn: getArbeitsbereiche });
  
  const [abForm, setAbForm] = useState({ name: '', icon: '📍', color: '#3b98f8', minVolunteers: 2, maxVolunteers: 8 });
  const [editingAb, setEditingAb] = useState<number | null>(null);
  const [emojiPicker, setEmojiPicker] = useState(false);

  const saveArbeitsbereich = async () => {
    if (!abForm.name.trim()) return alert('Name erforderlich!');
    if (editingAb) { await apiPatch(`/api/arbeitsbereiche/${editingAb}`, abForm); }
    else { await apiPost('/api/arbeitsbereiche', abForm); }
    queryClient.invalidateQueries({ queryKey: ['arbeitsbereiche'] });
    setAbForm({ name: '', icon: '📍', color: '#3b98f8', minVolunteers: 2, maxVolunteers: 8 });
    setEditingAb(null);
  };

  const deleteArbeitsbereich = async (id: number) => {
    if (!confirm('Bereich löschen?')) return;
    await apiDelete(`/api/arbeitsbereiche/${id}`);
    queryClient.invalidateQueries({ queryKey: ['arbeitsbereiche'] });
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>📍 Arbeitsbereiche</h3>
      
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={abForm.name} onChange={e => setAbForm({ ...abForm, name: e.target.value })} placeholder="Name" style={{ ...inputStyle, width: 200 }} />
        
        <div style={{ position: 'relative' }}>
          <button onClick={() => setEmojiPicker(!emojiPicker)} style={{ ...btnStyle, fontSize: 20, background: '#f8f9fa', padding: '6px 12px' }}>{abForm.icon}</button>
          {emojiPicker && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: 10, background: '#fff', border: '1px solid #dee2e6', borderRadius: 12, position: 'absolute', top: 45, zIndex: 1000, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', width: 280 }}>
              {emojiList.map(e => (
                <button key={e} onClick={() => { setAbForm({ ...abForm, icon: e }); setEmojiPicker(false); }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4 }}>{e}</button>
              ))}
            </div>
          )}
        </div>
        
        <input type="color" value={abForm.color} onChange={e => setAbForm({ ...abForm, color: e.target.value })} style={{ width: 44, height: 38, padding: 0, border: '1px solid #dee2e6', borderRadius: 8, cursor: 'pointer' }} />
        <input type="number" value={abForm.minVolunteers} onChange={e => setAbForm({ ...abForm, minVolunteers: parseInt(e.target.value) || 0 })} placeholder="Min" style={{ ...inputStyle, width: 60 }} title="Minimum Helfer" />
        <input type="number" value={abForm.maxVolunteers} onChange={e => setAbForm({ ...abForm, maxVolunteers: parseInt(e.target.value) || 0 })} placeholder="Max" style={{ ...inputStyle, width: 60 }} title="Maximum Helfer" />
        
        <button onClick={saveArbeitsbereich} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
          {editingAb ? '💾 Speichern' : '➕ Hinzufügen'}
        </button>
        {editingAb && <button onClick={() => { setEditingAb(null); setAbForm({ name: '', icon: '📍', color: '#3b98f8', minVolunteers: 2, maxVolunteers: 8 }); }} style={{ ...btnStyle, background: '#e9ecef' }}>Abbrechen</button>}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Icon</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Farbe</th>
            <th style={thStyle}>Min</th>
            <th style={thStyle}>Max</th>
            <th style={thStyle}>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {arbeitsbereiche.map(ab => (
            <tr key={ab.id}>
              <td style={{ ...tdStyle, fontSize: 24, textAlign: 'center' }}>{ab.icon}</td>
              <td style={tdStyle}>{ab.name}</td>
              <td style={tdStyle}><div style={{ background: ab.color, width: 40, height: 20, borderRadius: 4 }}></div></td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{ab.minVolunteers}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{ab.maxVolunteers}</td>
              <td style={tdStyle}>
                <button onClick={() => { setEditingAb(ab.id); setAbForm({ name: ab.name, icon: ab.icon, color: ab.color, minVolunteers: ab.minVolunteers, maxVolunteers: ab.maxVolunteers }); }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', border: 'none', marginRight: 6 }}>✏️</button>
                <button onClick={() => deleteArbeitsbereich(ab.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}>🗑️</button>
              </td>
            </tr>
          ))}
          {arbeitsbereiche.length === 0 && <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#666', padding: 24 }}>Keine Arbeitsbereiche vorhanden.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
