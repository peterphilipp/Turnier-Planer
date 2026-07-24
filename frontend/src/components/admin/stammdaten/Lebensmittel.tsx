import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFoodCategories, getFoodItems, apiPost, apiPatch, apiDelete } from '../../../api';
import { btnStyleSecondary } from '../shared';
import type { FoodCategory, FoodItem } from '../shared';
import EditModal from '../EditModal';

const EMOJI_PICKER = ['🍞', '🥖', '🧀', '🥩', '🐟', '🥚', '🥛', '🍰', '🎂', '🍪', '🍫', '☕', '🍵', '🧃', '🍺', '🥤', '🍎', '🍌', '🥬', '🥕', '🍅', '🧅', '🥔', '🌽', '🍄', '🫒', '🧈', '🍯', '🧂', '🥜'];

interface LebensmittelProps {
  adminPrimary: string;
}

export default function Lebensmittel({ adminPrimary }: LebensmittelProps) {
  const queryClient = useQueryClient();
  
  // Kategorien state
  const [editingFoodCat, setEditingFoodCat] = useState<number | null>(null);
  const [foodCatForm, setFoodCatForm] = useState({ name: '', icon: '🍽️', order: 0 });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Artikel state
  const [editingFoodItem, setEditingFoodItem] = useState<number | null>(null);
  const [foodItemForm, setFoodItemForm] = useState({ categoryId: 0, name: '', price: '', unit: 'Stk' });

  const { data: foodCategories = [] } = useQuery<FoodCategory[]>({ queryKey: ['foodCategories'], queryFn: getFoodCategories });
  const { data: foodItems = [] } = useQuery<FoodItem[]>({ queryKey: ['foodItems'], queryFn: getFoodItems });

  // Kategorien actions
  const saveFoodCategory = async () => {
    if (!foodCatForm.name.trim()) return await modal.alert({ title: 'Hinweis', message: 'Name erforderlich!' });
    if (editingFoodCat) { await apiPatch(`/api/food/categories/${editingFoodCat}`, foodCatForm); }
    else { await apiPost('/api/food/categories', foodCatForm); }
    queryClient.invalidateQueries({ queryKey: ['foodCategories'] });
    setFoodCatForm({ name: '', icon: '🍽️', order: 0 });
    setEditingFoodCat(null);
  };

  const deleteFoodCategory = async (id: number) => {
    if (!(await modal.confirm({ title: 'Kategorie löschen', message: 'Möchtest du diese Kategorie wirklich löschen? Alle zugehörigen Artikel werden ebenfalls gelöscht.', variant: 'danger' }))) return;
    await apiDelete(`/api/food/categories/${id}`);
    queryClient.invalidateQueries({ queryKey: ['foodCategories'] });
    queryClient.invalidateQueries({ queryKey: ['foodItems'] });
  };

  // Artikel actions
  const saveFoodItem = async () => {
    if (!foodItemForm.name.trim()) return await modal.alert({ title: 'Hinweis', message: 'Name erforderlich!' });
    if (foodItemForm.categoryId === 0) return await modal.alert({ title: 'Hinweis', message: 'Kategorie wählen!' });
    try {
      if (editingFoodItem) { await apiPatch(`/api/food/items/${editingFoodItem}`, foodItemForm); }
      else { await apiPost('/api/food/items', foodItemForm); }
      queryClient.invalidateQueries({ queryKey: ['foodItems'] });
      setFoodItemForm({ categoryId: 0, name: '', price: '', unit: 'Stk' });
      setEditingFoodItem(null);
    } catch (err) { await modal.alert({ title: 'Fehler', message: `Speichern fehlgeschlagen: ${(err as Error).message}` }); }
  };

  const deleteFoodItem = async (id: number) => {
    if (!(await modal.confirm({ title: 'Artikel löschen', message: 'Möchtest du diesen Artikel wirklich löschen?', variant: 'danger' }))) return;
    await apiDelete(`/api/food/items/${id}`);
    queryClient.invalidateQueries({ queryKey: ['foodItems'] });
  };

  const selectEmoji = (emoji: string) => { setFoodCatForm(f => ({ ...f, icon: emoji })); setShowEmojiPicker(false); };

  // Open/close handlers
  const openEditCat = (cat: FoodCategory) => { setEditingFoodCat(cat.id); setFoodCatForm({ name: cat.name, icon: cat.icon, order: cat.order }); setShowEmojiPicker(false); };
  const closeEditCat = () => { setEditingFoodCat(null); setFoodCatForm({ name: '', icon: '🍽️', order: 0 }); setShowEmojiPicker(false); };

  const openEditItem = (item: FoodItem) => { setEditingFoodItem(item.id); setFoodItemForm({ categoryId: item.categoryId, name: item.name, price: item.price || '', unit: item.unit }); };
  const closeEditItem = () => { setEditingFoodItem(null); setFoodItemForm({ categoryId: 0, name: '', price: '', unit: 'Stk' }); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Kategorien */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: '600', color: '#212529' }}>📂 Kategorien</h3>
        
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8, background: '#f8f9fa', borderRadius: 8, marginBottom: 12 }}>
            {EMOJI_PICKER.map(emoji => (<button key={emoji} onClick={() => selectEmoji(emoji)} style={{ fontSize: 20, padding: '4px 6px', border: foodCatForm.icon === emoji ? '2px solid #0d6efd' : '1px solid #dee2e6', background: foodCatForm.icon === emoji ? '#e8f4fd' : '#fff', borderRadius: 6, cursor: 'pointer' }}>{emoji}</button>))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: '#f8f9fa', borderRadius: 8, cursor: 'pointer', border: showEmojiPicker ? '2px solid #0d6efd' : '1px solid #dee2e6', userSelect: 'none' }} title="Emoji auswählen">{foodCatForm.icon}</div>
          <input value={foodCatForm.name} onChange={e => setFoodCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Kategoriename" style={{ flex: 1, minWidth: 200, padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
          <button onClick={saveFoodCategory} style={{ padding: '14px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, minHeight: 44, minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15 }}>
            <span>➕</span><span>Hinzufügen</span>
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '2px solid #e9ecef' }}><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Icon</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Name</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>Artikel</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Aktion</th></tr></thead>
          <tbody>
            {foodCategories.map(cat => (
              <tr key={cat.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 12px', fontSize: 24 }}>{cat.icon}</td>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{cat.name}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6c757d' }}>{cat.items?.length || 0}</td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEditCat(cat)} style={{ width: 40, height: 40, border: 'none', background: '#fff3cd', color: '#856404', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✏️</button>
                    <button onClick={() => deleteFoodCategory(cat.id)} style={{ width: 40, height: 40, border: 'none', background: '#ffe3e3', color: '#dc3545', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Kategorie Edit Modal */}
        {editingFoodCat && (
          <EditModal title="Kategorie bearbeiten" onClose={closeEditCat}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input value={foodCatForm.name} onChange={e => setFoodCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Kategoriename" style={{ padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
              <div>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Icon</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {EMOJI_PICKER.map(emoji => (<button key={emoji} onClick={() => setFoodCatForm(f => ({ ...f, icon: emoji }))} style={{ fontSize: 20, padding: '6px 8px', border: foodCatForm.icon === emoji ? '2px solid #0d6efd' : '1px solid #dee2e6', background: foodCatForm.icon === emoji ? '#e8f4fd' : '#fff', borderRadius: 8, cursor: 'pointer' }}>{emoji}</button>))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #e9ecef' }}>
                <button onClick={closeEditCat} style={{ ...btnStyleSecondary, border: '1px solid #dee2e6', background: '#fff' }}>Abbrechen</button>
                <button onClick={saveFoodCategory} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>💾 Speichern</button>
              </div>
            </div>
          </EditModal>
        )}
      </div>

      {/* Artikel */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: '600', color: '#212529' }}>📦 Artikel</h3>
        
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={foodItemForm.categoryId} onChange={e => setFoodItemForm(f => ({ ...f, categoryId: parseInt(e.target.value) }))} style={{ padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }}>
            <option value={0}>-- Kategorie --</option>
            {foodCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <input value={foodItemForm.name} onChange={e => setFoodItemForm(f => ({ ...f, name: e.target.value }))} placeholder="Artikelname" style={{ flex: 1, minWidth: 150, padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
          <input value={foodItemForm.price} onChange={e => setFoodItemForm(f => ({ ...f, price: e.target.value }))} placeholder="Preis" type="number" step="0.01" style={{ width: 90, padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
          <select value={foodItemForm.unit} onChange={e => setFoodItemForm(f => ({ ...f, unit: e.target.value }))} style={{ padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }}>
            <option value="Stk">Stk</option><option value="kg">kg</option><option value="L">L</option><option value="Tüte">Tüte</option><option value="Set">Set</option>
          </select>
          <button onClick={saveFoodItem} style={{ padding: '14px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, minHeight: 44, minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15 }}>
            <span>➕</span><span>Hinzufügen</span>
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '2px solid #e9ecef' }}><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Icon</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Name</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Kategorie</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>Preis</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Einheit</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Aktion</th></tr></thead>
          <tbody>
            {foodItems.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 12px', fontSize: 20 }}>{item.category?.icon || '📦'}</td>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{item.name}</td>
                <td style={{ padding: '10px 12px', color: '#6c757d' }}>{item.category?.icon} {item.category?.name || '–'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: item.price ? '#2e7d32' : '#adb5bd' }}>{item.price ? `${item.price} €` : '–'}</td>
                <td style={{ padding: '10px 12px' }}>{item.unit}</td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEditItem(item)} style={{ width: 40, height: 40, border: 'none', background: '#fff3cd', color: '#856404', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✏️</button>
                    <button onClick={() => deleteFoodItem(item.id)} style={{ width: 40, height: 40, border: 'none', background: '#ffe3e3', color: '#dc3545', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Artikel Edit Modal */}
        {editingFoodItem && (
          <EditModal title="Artikel bearbeiten" onClose={closeEditItem}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <select value={foodItemForm.categoryId} onChange={e => setFoodItemForm(f => ({ ...f, categoryId: parseInt(e.target.value) }))} style={{ padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }}>
                <option value={0}>-- Kategorie --</option>
                {foodCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <input value={foodItemForm.name} onChange={e => setFoodItemForm(f => ({ ...f, name: e.target.value }))} placeholder="Artikelname" style={{ padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <input value={foodItemForm.price} onChange={e => setFoodItemForm(f => ({ ...f, price: e.target.value }))} placeholder="Preis" type="number" step="0.01" style={{ padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
                <select value={foodItemForm.unit} onChange={e => setFoodItemForm(f => ({ ...f, unit: e.target.value }))} style={{ padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }}>
                  <option value="Stk">Stk</option><option value="kg">kg</option><option value="L">L</option><option value="Tüte">Tüte</option><option value="Set">Set</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #e9ecef' }}>
                <button onClick={closeEditItem} style={{ ...btnStyleSecondary, border: '1px solid #dee2e6', background: '#fff' }}>Abbrechen</button>
                <button onClick={saveFoodItem} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>💾 Speichern</button>
              </div>
            </div>
          </EditModal>
        )}
      </div>
    </div>
  );
}
