import { useState } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFoodCategories, getFoodItems, apiPost, apiPatch, apiDelete } from '../../../api';
import { btnStyleSecondary, useSortableData, confirmWithImpact } from '../shared';
import type { FoodCategory, FoodItem } from '../shared';
import EditModal from '../EditModal';

const EMOJI_PICKER = ['🍞', '🥖', '🧀', '🥩', '🐟', '🥚', '🥛', '🍰', '🎂', '🍪', '🍫', '☕', '🍵', '🧃', '🍺', '🥤', '🍎', '🍌', '🥬', '🥕', '🍅', '🧅', '🥔', '🌽', '🍄', '🫒', '🧈', '🍯', '🧂', '🥜'];
const FOOD_UNITS = ['Stk', 'Portion', 'Packung', 'kg', 'Liter', 'Tüte', 'Set'];

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

  const { items: sortedCategories, requestSort: sortCat, getSortIndicator: getCatInd } = useSortableData(foodCategories, { key: 'order', direction: 'asc' });
  const { items: sortedItems, requestSort: sortItem, getSortIndicator: getItemInd } = useSortableData(foodItems, { key: 'name', direction: 'asc' });

  // Kategorien actions
  //
  // Verpflegungs-Slots (FoodDonationSlots.tsx) laden Kategorie/Artikel nicht
  // separat, sondern eingebettet in ihre eigene foodDonationSlots-Abfrage
  // (include: { foodItem: { include: { category: true } } }) - ein reines
  // invalidateQueries(['foodItems']/['foodCategories']) aktualisiert nur die
  // Listen hier auf dieser Seite. Ohne die zusätzliche Invalidierung unten
  // blieb ein umbenannter Artikel/eine umbenannte Kategorie dort so lange
  // beim alten Namen, bis die Seite neu geladen wurde.
  const saveFoodCategory = async () => {
    if (!foodCatForm.name.trim()) return await modal.alert({ title: 'Hinweis', message: 'Name erforderlich!' });
    if (editingFoodCat) { await apiPatch(`/api/food/categories/${editingFoodCat}`, foodCatForm); }
    else { await apiPost('/api/food/categories', foodCatForm); }
    queryClient.invalidateQueries({ queryKey: ['foodCategories'] });
    queryClient.invalidateQueries({ queryKey: ['foodDonationSlots'] });
    setFoodCatForm({ name: '', icon: '🍽️', order: 0 });
    setEditingFoodCat(null);
  };

  const deleteFoodCategory = async (cat: FoodCategory) => {
    if (!(await confirmWithImpact('foodCategory', cat.id, cat.name))) return;
    await apiDelete(`/api/food/categories/${cat.id}`);
    queryClient.invalidateQueries({ queryKey: ['foodCategories'] });
    queryClient.invalidateQueries({ queryKey: ['foodItems'] });
    queryClient.invalidateQueries({ queryKey: ['foodDonationSlots'] });
  };

  // Artikel actions
  const saveFoodItem = async () => {
    if (!foodItemForm.name.trim()) return await modal.alert({ title: 'Hinweis', message: 'Name erforderlich!' });
    if (foodItemForm.categoryId === 0) return await modal.alert({ title: 'Hinweis', message: 'Kategorie wählen!' });
    try {
      if (editingFoodItem) { await apiPatch(`/api/food/items/${editingFoodItem}`, foodItemForm); }
      else { await apiPost('/api/food/items', foodItemForm); }
      queryClient.invalidateQueries({ queryKey: ['foodItems'] });
      queryClient.invalidateQueries({ queryKey: ['foodDonationSlots'] });
      setFoodItemForm({ categoryId: 0, name: '', price: '', unit: 'Stk' });
      setEditingFoodItem(null);
    } catch (err) { await modal.alert({ title: 'Fehler', message: `Speichern fehlgeschlagen: ${(err as Error).message}` }); }
  };

  const deleteFoodItem = async (item: FoodItem) => {
    if (!(await confirmWithImpact('foodItem', item.id, item.name))) return;
    await apiDelete(`/api/food/items/${item.id}`);
    queryClient.invalidateQueries({ queryKey: ['foodItems'] });
    queryClient.invalidateQueries({ queryKey: ['foodDonationSlots'] });
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

        {/* Kategorie Neu hinzufügen */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch', marginBottom: 16 }}>
          <div style={{ flex: 2, minWidth: 250, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📝 Name</label>
            <input value={foodCatForm.name} onChange={e => setFoodCatForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Getränke" style={{ width: '100%', padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44, boxSizing: 'border-box' }} />
          </div>
          <div style={{ width: 70, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>😀 Icon</label>
            <div onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: '#f8f9fa', borderRadius: 8, cursor: 'pointer', border: showEmojiPicker ? '2px solid #0d6efd' : '1px solid #dee2e6', userSelect: 'none' }} title="Emoji auswählen">{foodCatForm.icon}</div>
          </div>
          <button onClick={saveFoodCategory} style={{ padding: '8px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, height: 44, minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15 }}>
            <span style={{ fontSize: 18, fontWeight: 'bold', lineHeight: 1 }} aria-hidden="true">+</span><span>Hinzufügen</span>
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '2px solid #e9ecef' }}><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Icon</th><th onClick={() => sortCat('name')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>Name{getCatInd('name')}</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right' }}>Artikel</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Aktion</th></tr></thead>
          <tbody>
            {sortedCategories.map(cat => (
              <tr key={cat.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 12px', fontSize: 24 }}>{cat.icon}</td>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{cat.name}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#6c757d' }}>{cat.items?.length || 0}</td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEditCat(cat)} style={{ width: 40, height: 40, border: 'none', background: '#fff3cd', color: '#856404', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✏️</button>
                    <button onClick={() => deleteFoodCategory(cat)} style={{ width: 40, height: 40, border: 'none', background: '#ffe3e3', color: '#dc3545', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Kategorie Edit Modal */}
        {editingFoodCat && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '90%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>✏️ Kategorie bearbeiten</h3>
                <button onClick={closeEditCat} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#666' }}>×</button>
              </div>
              {/* Scrollbarer Inhalt */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📝 Name</label>
                    <input value={foodCatForm.name} onChange={e => setFoodCatForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Getränke" style={{ padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }} />
                  </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>😀 Icon</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                  {EMOJI_PICKER.map(emoji => (<button key={emoji} onClick={() => setFoodCatForm(f => ({ ...f, icon: emoji }))} style={{ fontSize: 20, padding: '6px 8px', border: foodCatForm.icon === emoji ? '2px solid #0d6efd' : '1px solid #dee2e6', background: foodCatForm.icon === emoji ? '#e8f4fd' : '#fff', borderRadius: 8, cursor: 'pointer' }}>{emoji}</button>))}
                </div>
              </div>
              {/* Fixierter Footer – IMMER sichtbar (§13.2) */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #e9ecef', marginTop: 0, position: 'sticky', bottom: 0, background: '#fff' }}>
                <button onClick={closeEditCat} style={{ ...btnStyleSecondary, border: '1px solid #dee2e6', background: '#fff' }}>Abbrechen</button>
                <button onClick={saveFoodCategory} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>💾 Speichern</button>
              </div>
            </div>
          </div>
        </div>
      </div>
        )}
      </div>

      {/* Artikel */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: '600', color: '#212529' }}>📦 Artikel</h3>
        
        {/* Artikel Neu hinzufügen */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch', marginBottom: 16 }}>
          <div style={{ flex: 2, minWidth: 250, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📝 Name</label>
            <input value={foodItemForm.name} onChange={e => setFoodItemForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Wasser" style={{ width: '100%', padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44, boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📂 Kategorie</label>
            <select value={foodItemForm.categoryId} onChange={e => setFoodItemForm(f => ({ ...f, categoryId: parseInt(e.target.value) }))} style={{ width: '100%', padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }}>
              <option value={0}>-- Kategorie --</option>
              {foodCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div style={{ width: 90, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>💰 Preis</label>
            <input value={foodItemForm.price} onChange={e => setFoodItemForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" type="number" step="0.01" style={{ width: '100%', padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44, boxSizing: 'border-box' }} />
          </div>
          <div style={{ width: 100, display: 'flex', flexDirection: 'column' }}>
            <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📏 Einheit</label>
            <select value={foodItemForm.unit} onChange={e => setFoodItemForm(f => ({ ...f, unit: e.target.value }))} style={{ width: '100%', padding: '14px 8px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }}>
              {FOOD_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <button onClick={saveFoodItem} style={{ padding: '8px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, height: 44, minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15 }}>
            <span style={{ fontSize: 18, fontWeight: 'bold', lineHeight: 1 }} aria-hidden="true">+</span><span>Hinzufügen</span>
          </button>
        </div>


        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '2px solid #e9ecef' }}><th onClick={() => sortItem('name')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>Name{getItemInd('name')}</th><th onClick={() => sortItem('categoryName')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>Kategorie{getItemInd('categoryName')}</th><th onClick={() => sortItem('price')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'right', cursor: 'pointer' }}>Preis{getItemInd('price')}</th><th onClick={() => sortItem('unit')} style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left', cursor: 'pointer' }}>Einheit{getItemInd('unit')}</th><th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13, textAlign: 'left' }}>Aktion</th></tr></thead>
          <tbody>
            {sortedItems.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500 }}>{item.name}</td>
                <td style={{ padding: '10px 12px', color: '#6c757d' }}>{item.category?.icon} {item.category?.name || '–'}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: item.price ? '#2e7d32' : '#adb5bd' }}>{item.price ? `${item.price} €` : '–'}</td>
                <td style={{ padding: '10px 12px' }}>{item.unit}</td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEditItem(item)} style={{ width: 40, height: 40, border: 'none', background: '#fff3cd', color: '#856404', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✏️</button>
                    <button onClick={() => deleteFoodItem(item)} style={{ width: 40, height: 40, border: 'none', background: '#ffe3e3', color: '#dc3545', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Artikel Edit Modal */}
        {editingFoodItem && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '28px 32px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '90%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>✏️ Artikel bearbeiten</h3>
                <button onClick={closeEditItem} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#666' }}>×</button>
              </div>
              {/* Scrollbarer Inhalt */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📂 Kategorie</label>
                    <select value={foodItemForm.categoryId} onChange={e => setFoodItemForm(f => ({ ...f, categoryId: parseInt(e.target.value) }))} style={{ padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }}>
                      <option value={0}>-- Kategorie --</option>
                      {foodCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📝 Name</label>
                    <input value={foodItemForm.name} onChange={e => setFoodItemForm(f => ({ ...f, name: e.target.value }))} placeholder="z.B. Wasser" style={{ padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44, width: '100%', boxSizing: 'border-box' }} />
                  </div>
              <div>
                <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>💰 Preis & 📏 Einheit</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input value={foodItemForm.price} onChange={e => setFoodItemForm(f => ({ ...f, price: e.target.value }))} placeholder="Preis" type="number" step="0.01" style={{ padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
                  <select value={foodItemForm.unit} onChange={e => setFoodItemForm(f => ({ ...f, unit: e.target.value }))} style={{ padding: '14px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }}>
                    {FOOD_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
            {/* Fixierter Footer – IMMER sichtbar (§13.2) */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #e9ecef', marginTop: 0, position: 'sticky', bottom: 0, background: '#fff' }}>
              <button onClick={closeEditItem} style={{ ...btnStyleSecondary, border: '1px solid #dee2e6', background: '#fff' }}>Abbrechen</button>
              <button onClick={saveFoodItem} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>💾 Speichern</button>
            </div>
          </div>
        </div>
      </div>
        )}
      </div>
    </div>
  );
}
