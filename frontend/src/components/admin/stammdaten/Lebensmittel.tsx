import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFoodCategories, getFoodItems, apiPost, apiPatch, apiDelete } from '../../../api';
import type { FoodCategory, FoodItem } from '../shared';

interface LebensmittelProps {
  adminPrimary: string;
}

export default function Lebensmittel({ adminPrimary }: LebensmittelProps) {
  const queryClient = useQueryClient();
  const [editingFoodCat, setEditingFoodCat] = useState<number | null>(null);
  const [foodCatForm, setFoodCatForm] = useState({ name: '', icon: '🍽️', order: 0 });
  const [editingFoodItem, setEditingFoodItem] = useState<number | null>(null);
  const [foodItemForm, setFoodItemForm] = useState({ categoryId: 0, name: '', price: '', unit: 'Stk' });

  const { data: foodCategories = [] } = useQuery<FoodCategory[]>({ queryKey: ['foodCategories'], queryFn: getFoodCategories });
  const { data: foodItems = [] } = useQuery<FoodItem[]>({ queryKey: ['foodItems'], queryFn: getFoodItems });

  const saveFoodCategory = async () => {
    if (!foodCatForm.name.trim()) return alert('Name erforderlich!');
    if (editingFoodCat) {
      await apiPatch(`/api/food/categories/${editingFoodCat}`, foodCatForm);
    } else {
      await apiPost('/api/food/categories', foodCatForm);
    }
    queryClient.invalidateQueries({ queryKey: ['foodCategories'] });
    setFoodCatForm({ name: '', icon: '🍽️', order: 0 });
    setEditingFoodCat(null);
  };

  const deleteFoodCategory = async (id: number) => {
    if (!confirm('Kategorie wirklich löschen?')) return;
    await apiDelete(`/api/food/categories/${id}`);
    queryClient.invalidateQueries({ queryKey: ['foodCategories'] });
    queryClient.invalidateQueries({ queryKey: ['foodItems'] });
  };

  const saveFoodItem = async () => {
    if (!foodItemForm.name.trim()) return alert('Name erforderlich!');
    if (foodItemForm.categoryId === 0) return alert('Kategorie wählen!');
    if (editingFoodItem) {
      await apiPatch(`/api/food/items/${editingFoodItem}`, foodItemForm);
    } else {
      await apiPost('/api/food/items', foodItemForm);
    }
    queryClient.invalidateQueries({ queryKey: ['foodItems'] });
    queryClient.invalidateQueries({ queryKey: ['foodCategories'] });
    setFoodItemForm({ categoryId: 0, name: '', price: '', unit: 'Stk' });
    setEditingFoodItem(null);
  };

  const deleteFoodItem = async (id: number) => {
    if (!confirm('Artikel wirklich löschen?')) return;
    await apiDelete(`/api/food/items/${id}`);
    queryClient.invalidateQueries({ queryKey: ['foodItems'] });
    queryClient.invalidateQueries({ queryKey: ['foodCategories'] });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Kategorien */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: '600', color: '#212529' }}>Kategorien</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input value={foodCatForm.icon} onChange={e => setFoodCatForm(f => ({ ...f, icon: e.target.value }))} placeholder="🍽️" style={{ width: 48, padding: 8, border: '1px solid #dee2e6', borderRadius: 8, textAlign: 'center', fontSize: 20 }} />
          <input value={foodCatForm.name} onChange={e => setFoodCatForm(f => ({ ...f, name: e.target.value }))} placeholder="Kategoriename" style={{ flex: 1, padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 14 }} />
          <button onClick={saveFoodCategory} style={{ padding: '10px 16px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: '600', fontSize: 14 }}>{editingFoodCat ? '💾 Speichern' : '➕ Hinzufügen'}</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '2px solid #e9ecef' }}><th style={{ padding: '10px 12px', fontWeight: '600', fontSize: 13 }}>Icon</th><th style={{ padding: '10px 12px', fontWeight: '600', fontSize: 13 }}>Name</th><th style={{ padding: '10px 12px', fontWeight: '600', fontSize: 13 }}>Aktion</th></tr></thead>
          <tbody>
            {foodCategories.map(cat => (
              <tr key={cat.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 12px', fontSize: 20 }}>{cat.icon}</td>
                <td style={{ padding: '10px 12px' }}>{cat.name} ({cat.items?.length || 0})</td>
                <td style={{ padding: '10px 12px' }}>
                  <button onClick={() => { setEditingFoodCat(cat.id); setFoodCatForm({ name: cat.name, icon: cat.icon, order: cat.order }); }} style={{ padding: '6px 10px', border: 'none', background: '#e8f4fd', color: '#0d6efd', borderRadius: 6, cursor: 'pointer', marginRight: 4 }}>✏️</button>
                  <button onClick={() => deleteFoodCategory(cat.id)} style={{ padding: '6px 10px', border: 'none', background: '#fde8e8', color: '#dc3545', borderRadius: 6, cursor: 'pointer' }}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Artikel */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: '600', color: '#212529' }}>📦 Artikel</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={foodItemForm.categoryId} onChange={e => setFoodItemForm(f => ({ ...f, categoryId: parseInt(e.target.value) }))} style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 14 }}>
            <option value={0}>-- Kategorie --</option>
            {foodCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <input value={foodItemForm.name} onChange={e => setFoodItemForm(f => ({ ...f, name: e.target.value }))} placeholder="Artikelname" style={{ flex: 1, minWidth: 150, padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 14 }} />
          <input value={foodItemForm.price} onChange={e => setFoodItemForm(f => ({ ...f, price: e.target.value }))} placeholder="Preis" type="number" step="0.01" style={{ width: 80, padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 14 }} />
          <select value={foodItemForm.unit} onChange={e => setFoodItemForm(f => ({ ...f, unit: e.target.value }))} style={{ padding: '10px 12px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 14 }}>
            <option value="Stk">Stk</option>
            <option value="kg">kg</option>
            <option value="L">L</option>
            <option value="Tüte">Tüte</option>
            <option value="Set">Set</option>
          </select>
          <button onClick={saveFoodItem} style={{ padding: '10px 16px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: '600', fontSize: 14 }}>{editingFoodItem ? '💾 Speichern' : '➕ Hinzufügen'}</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '2px solid #e9ecef' }}><th style={{ padding: '10px 12px', fontWeight: '600', fontSize: 13 }}>Name</th><th style={{ padding: '10px 12px', fontWeight: '600', fontSize: 13 }}>Kategorie</th><th style={{ padding: '10px 12px', fontWeight: '600', fontSize: 13 }}>Preis</th><th style={{ padding: '10px 12px', fontWeight: '600', fontSize: 13 }}>Einheit</th><th style={{ padding: '10px 12px', fontWeight: '600', fontSize: 13 }}>Aktion</th></tr></thead>
          <tbody>
            {foodItems.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 12px' }}>{item.name}</td>
                <td style={{ padding: '10px 12px' }}>{item.category?.icon} {item.category?.name || '–'}</td>
                <td style={{ padding: '10px 12px' }}>{item.price || '–'}</td>
                <td style={{ padding: '10px 12px' }}>{item.unit}</td>
                <td style={{ padding: '10px 12px' }}>
                  <button onClick={() => { setEditingFoodItem(item.id); setFoodItemForm({ categoryId: item.categoryId, name: item.name, price: item.price || '', unit: item.unit }); }} style={{ padding: '6px 10px', border: 'none', background: '#e8f4fd', color: '#0d6efd', borderRadius: 6, cursor: 'pointer', marginRight: 4 }}>✏️</button>
                  <button onClick={() => deleteFoodItem(item.id)} style={{ padding: '6px 10px', border: 'none', background: '#fde8e8', color: '#dc3545', borderRadius: 6, cursor: 'pointer' }}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
