import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getWorkAreaCategories, createWorkAreaCategory, updateWorkAreaCategory, deleteWorkAreaCategory, updateWorkAreaCategoryOrder } from '../../../api';
import { modal } from '../Modal';
import { btnStyle, inputStyle, confirmWithImpact } from '../shared';
import type { WorkAreaCategory } from '../shared';

export default function WorkAreaCategories({ adminPrimary = '#6c757d' }: { adminPrimary?: string }) {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery<WorkAreaCategory[]>({ queryKey: ['work-area-categories'], queryFn: getWorkAreaCategories });

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['work-area-categories'] });
    qc.invalidateQueries({ queryKey: ['work-areas'] });
    qc.invalidateQueries({ queryKey: ['day-templates'] });
  };

  const addCategory = async () => {
    if (!newName.trim()) return;
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    await createWorkAreaCategory({ name: newName.trim(), color: randomColor });
    setNewName('');
    refresh();
  };

  const removeCategory = async (cat: WorkAreaCategory) => {
    if (!(await confirmWithImpact('workAreaCategory', cat.id, cat.name))) return;
    await deleteWorkAreaCategory(cat.id);
    refresh();
  };

  const toggleObsolete = async (cat: WorkAreaCategory) => {
    await updateWorkAreaCategory(cat.id, { isObsolete: !cat.isObsolete });
    refresh();
  };

  const updateColor = async (id: number, color: string) => {
    await updateWorkAreaCategory(id, { color });
    refresh();
  };
  
  const updateName = async (id: number, name: string) => {
    await updateWorkAreaCategory(id, { name });
    refresh();
  };

  const handleSort = async () => {
    if (dragItemIndex.current === null || dragOverItemIndex.current === null) return;
    if (dragItemIndex.current === dragOverItemIndex.current) return;

    const _cats = [...categories];
    const draggedItem = _cats.splice(dragItemIndex.current, 1)[0];
    _cats.splice(dragOverItemIndex.current, 0, draggedItem);

    const newOrder = _cats.map(t => t.id);
    await updateWorkAreaCategoryOrder(newOrder);
    refresh();

    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ margin: '0 0 4px 0', color: '#212557' }}>🏷️ Arbeitsbereich-Kategorien</h3>
      <p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>
        Verwalte Kategorien (z.B. Aufbau, Spielbetrieb), die Arbeitsbereichen zugeordnet werden können. 
        Tagesvorlagen generieren ihren Namen vollautomatisch aus diesen Kategorien.
      </p>

      <div style={{ display: 'flex', gap: 8, margin: '16px 0', flexWrap: 'wrap' }}>
        <input 
          style={{ ...inputStyle, flex: 1, minWidth: 200 }} 
          placeholder="Neue Kategorie (z. B. Siegerehrung)" 
          value={newName}
          onChange={e => setNewName(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && addCategory()} 
        />
        <button style={{ ...btnStyle, background: adminPrimary, color: '#fff' }} onClick={addCategory}>+ Kategorie</button>
      </div>

      {categories.length === 0 && <p style={{ color: '#888' }}>Keine Kategorien vorhanden.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {categories.map((c, idx) => (
          <div 
            key={c.id} 
            draggable 
            onDragStart={() => (dragItemIndex.current = idx)} 
            onDragEnter={() => (dragOverItemIndex.current = idx)} 
            onDragEnd={handleSort} 
            onDragOver={e => e.preventDefault()}
            style={{ 
              display: 'flex', alignItems: 'center', gap: 12, border: '1px solid #e9ecef', 
              borderRadius: 8, padding: 12, background: c.isObsolete ? '#f8f9fa' : '#fff',
              opacity: c.isObsolete ? 0.6 : 1, cursor: 'grab' 
            }}
          >
            <div style={{ cursor: 'grab', color: '#ccc', padding: '0 4px' }}>⋮⋮</div>
            
            <input 
              type="color" 
              value={c.color} 
              onChange={e => updateColor(c.id, e.target.value)}
              style={{ width: 32, height: 32, padding: 0, border: 'none', borderRadius: 4, cursor: 'pointer' }}
              title="Farbe ändern"
            />

            {editingId === c.id ? (
              <input 
                autoFocus 
                style={{ ...inputStyle, flex: 1 }} 
                defaultValue={c.name}
                onBlur={e => { updateName(c.id, e.target.value); setEditingId(null); }}
                onKeyDown={e => { if (e.key === 'Enter') { updateName(c.id, e.currentTarget.value); setEditingId(null); } }}
              />
            ) : (
              <strong style={{ flex: 1, cursor: 'pointer', fontSize: 15 }} onClick={() => setEditingId(c.id)}>
                {c.name}
              </strong>
            )}

            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input type="checkbox" checked={c.isObsolete} onChange={() => toggleObsolete(c)} />
              obsolet
            </label>

            <button style={{ ...btnStyle, background: 'transparent', color: '#dc3545', padding: '4px 8px', minHeight: 32 }} onClick={() => removeCategory(c)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
