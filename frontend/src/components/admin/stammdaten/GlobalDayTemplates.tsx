import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDayTemplates, createDayTemplate, updateDayTemplate, deleteDayTemplate,
  addTemplateSlot, updateTemplateSlot, deleteTemplateSlot, setSlotWorkAreas, getWorkAreas
} from '../../../api';
import { modal } from '../Modal';
import { btnStyle, inputStyle, minToTime, timeToMin, getTemplateDisplayName } from '../shared';
import type { GlobalDayTemplate, GlobalDaySlot, WorkArea } from '../shared';

const getDefaultDraft = (t: GlobalDayTemplate) => {
  if (!t.slots || t.slots.length === 0) return { start: '09:00', end: '12:00', label: '' };
  const lastEnd = Math.max(...t.slots.map(s => s.endMin));
  return { start: minToTime(lastEnd), end: minToTime(lastEnd + 120), label: '' };
};

export default function GlobalDayTemplates({ adminPrimary = '#6c757d' }: { adminPrimary?: string }) {
  const qc = useQueryClient();
  const { data: templates = [] } = useQuery<GlobalDayTemplate[]>({ queryKey: ['day-templates'], queryFn: getDayTemplates });
  const { data: workAreas = [] } = useQuery<WorkArea[]>({ queryKey: ['work-areas'], queryFn: getWorkAreas });

  const [newName, setNewName] = useState('');
  const [slotDraft, setSlotDraft] = useState<Record<number, { start: string; end: string; label: string }>>({});
  const [editingTemplateIds, setEditingTemplateIds] = useState<Set<number>>(new Set());
  const refresh = () => qc.invalidateQueries({ queryKey: ['day-templates'] });

  const toggleEdit = (id: number) => {
    setEditingTemplateIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addTemplate = async () => {
    if (!newName.trim()) return;
    await createDayTemplate({ name: newName.trim() });
    setNewName('');
    refresh();
  };

  const duplicateTemplate = async (t: GlobalDayTemplate) => {
    const newT = await createDayTemplate({ name: `${t.name} (Kopie)`.trim() });
    
    // Kopiere alle Slots und deren WorkAreas
    for (const slot of t.slots || []) {
      const newSlot = await addTemplateSlot({ templateId: (newT as any).id, startMin: slot.startMin, endMin: slot.endMin, label: slot.label });
      const waIds = (slot.workAreas || []).map(w => w.workAreaId);
      if (waIds.length > 0) {
        await setSlotWorkAreas((newSlot as any).id, waIds);
      }
    }
    setEditingTemplateIds(prev => new Set([...prev, (newT as any).id])); // Direkt im Edit-Modus öffnen
    refresh();
  };

  const removeTemplate = async (t: GlobalDayTemplate) => {
    if (!(await modal.confirm({ title: 'Vorlage löschen', message: `Vorlage "${t.name}" inkl. Slots löschen?`, variant: 'danger' }))) return;
    await deleteDayTemplate(t.id);
    refresh();
  };

  const addSlot = async (t: GlobalDayTemplate) => {
    const def = getDefaultDraft(t);
    const d = slotDraft[t.id] || def;
    const startMin = timeToMin(d.start);
    const endMin = timeToMin(d.end);
    if (endMin <= startMin) { await modal.alert({ title: 'Hinweis', message: 'Ende muss nach dem Start liegen.' }); return; }
    await addTemplateSlot({ templateId: t.id, startMin, endMin, label: d.label || null });
    setSlotDraft(prev => ({ ...prev, [t.id]: { start: minToTime(endMin), end: minToTime(endMin + 120), label: '' } }));
    refresh();
  };

  const removeSlot = async (slotId: number) => {
    await deleteTemplateSlot(slotId);
    refresh();
  };

  const toggleWorkArea = async (slot: GlobalDaySlot, workAreaId: number, checked: boolean) => {
    const current = (slot.workAreas || []).map(w => w.workAreaId);
    const next = checked ? [...current, workAreaId] : current.filter(id => id !== workAreaId);
    await setSlotWorkAreas(slot.id, next);
    refresh();
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ margin: '0 0 4px 0', color: '#212557' }}>📅 Tag-Vorlagen</h3>
      <p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>
        Vorlagen für Tag-Typen (z. B. Aufbautag, Turniertag). Jede Vorlage besteht aus Zeit-Slots, denen Arbeitsbereiche zugeordnet werden.
      </p>

      <div style={{ display: 'flex', gap: 8, margin: '16px 0', flexWrap: 'wrap' }}>
        <input style={{ ...inputStyle, flex: 1, minWidth: 200 }} placeholder="Neue Vorlage (z. B. Turniertag)" value={newName}
          onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTemplate()} />
        <button style={{ ...btnStyle, background: adminPrimary, color: '#fff' }} onClick={addTemplate}>+ Vorlage</button>
      </div>

      {templates.length === 0 && <p style={{ color: '#888' }}>Noch keine Vorlagen angelegt.</p>}

      {templates.map(t => {
        const isEditing = editingTemplateIds.has(t.id);

        return (
          <div key={t.id} style={{ border: '1px solid #e9ecef', borderRadius: 12, padding: 16, marginBottom: 16, opacity: t.isObsolete ? 0.6 : 1 }}>
            
            {isEditing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: '#666' }}>Zusatz/Name:</span>
                <input 
                  style={{ ...inputStyle, flex: 1, maxWidth: 300 }} 
                  defaultValue={t.name} 
                  onBlur={async e => {
                    if (e.target.value !== t.name) {
                      await updateDayTemplate(t.id, { name: e.target.value });
                      refresh();
                    }
                  }} 
                />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {!isEditing && (
                <strong style={{ fontSize: 16 }}>{getTemplateDisplayName(t)}</strong>
              )}

              {t.isObsolete && <span style={{ fontSize: 12, color: '#dc3545' }}>obsolet</span>}
              <span style={{ flex: 1 }} />
              
              {isEditing && (
                <>
                  <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
                    <input type="checkbox" checked={t.isObsolete} onChange={async e => { await updateDayTemplate(t.id, { isObsolete: e.target.checked }); refresh(); }} />
                    obsolet
                  </label>
                  <button style={{ ...btnStyle, background: '#f8d7da', color: '#842029', minHeight: 36, padding: '6px 12px' }} onClick={() => removeTemplate(t)}>Löschen</button>
                </>
              )}
              
              <button style={{ ...btnStyle, background: '#f8f9fa', color: '#0d6efd', minHeight: 36, padding: '6px 12px', border: '1px solid #dee2e6', marginLeft: isEditing ? 8 : 0 }} onClick={() => duplicateTemplate(t)}>📑 Duplizieren</button>
              
              <button 
                style={{ ...btnStyle, background: isEditing ? '#e7f1ff' : '#f8f9fa', color: isEditing ? '#0d6efd' : '#333', minHeight: 36, padding: '6px 12px', border: '1px solid #dee2e6' }} 
                onClick={() => toggleEdit(t.id)}
              >
                {isEditing ? 'Fertig' : '✏️ Bearbeiten'}
              </button>
            </div>

            {/* Slots */}
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(t.slots || []).map(slot => (
                <div key={slot.id} style={{ background: '#f8f9fa', borderRadius: 8, padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input type="time" style={{ ...inputStyle, padding: '2px 6px', width: 90 }} defaultValue={minToTime(slot.startMin)} onBlur={async e => {
                          const newVal = timeToMin(e.target.value);
                          if (newVal !== slot.startMin) { await updateTemplateSlot(slot.id, { startMin: newVal }); refresh(); }
                        }} />
                        <span>–</span>
                        <input type="time" style={{ ...inputStyle, padding: '2px 6px', width: 90 }} defaultValue={minToTime(slot.endMin)} onBlur={async e => {
                          const newVal = timeToMin(e.target.value);
                          if (newVal !== slot.endMin) { await updateTemplateSlot(slot.id, { endMin: newVal }); refresh(); }
                        }} />
                      </div>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{minToTime(slot.startMin)}–{minToTime(slot.endMin)}</span>
                    )}
                    {slot.label && <span style={{ color: '#666', fontSize: 13 }}>{slot.label}</span>}
                    <span style={{ flex: 1 }} />
                    {isEditing && (
                      <button style={{ ...btnStyle, background: 'transparent', color: '#842029', minHeight: 32, padding: '4px 10px' }} onClick={() => removeSlot(slot.id)}>✕</button>
                    )}
                  </div>
                  {/* WorkArea-Zuordnung */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    {isEditing ? (
                      workAreas.map(wa => {
                        const checked = (slot.workAreas || []).some(w => w.workAreaId === wa.id);
                        return (
                          <label key={wa.id} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, background: checked ? '#e7f1ff' : '#fff', border: '1px solid #dee2e6', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={checked} onChange={e => toggleWorkArea(slot, wa.id, e.target.checked)} />
                            {wa.icon} {wa.name}
                          </label>
                        );
                      })
                    ) : (
                      <>
                        {(slot.workAreas || []).length === 0 ? (
                          <span style={{ fontSize: 13, color: '#999', fontStyle: 'italic' }}>Keine Arbeitsbereiche zugewiesen</span>
                        ) : (
                          (slot.workAreas || []).map(sw => {
                            const wa = workAreas.find(w => w.id === sw.workAreaId);
                            if (!wa) return null;
                            return (
                              <span key={wa.id} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, background: '#e7f1ff', color: '#0d6efd', border: '1px solid #b6d4fe', borderRadius: 6, padding: '4px 8px' }}>
                                {wa.icon} {wa.name}
                              </span>
                            );
                          })
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}

              {/* Neuer Slot - Nur im Edit-Modus */}
              {isEditing && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
                  {(() => {
                    const def = getDefaultDraft(t);
                    return (
                      <>
                        <input type="time" style={inputStyle} value={slotDraft[t.id]?.start ?? def.start}
                          onChange={e => setSlotDraft(p => ({ ...p, [t.id]: { ...(p[t.id] || def), start: e.target.value } }))} />
                        <span>–</span>
                        <input type="time" style={inputStyle} value={slotDraft[t.id]?.end ?? def.end}
                          onChange={e => setSlotDraft(p => ({ ...p, [t.id]: { ...(p[t.id] || def), end: e.target.value } }))} />
                        <input style={{ ...inputStyle, width: 160 }} placeholder="Label (optional)" value={slotDraft[t.id]?.label ?? ''}
                          onChange={e => setSlotDraft(p => ({ ...p, [t.id]: { ...(p[t.id] || def), label: e.target.value } }))} />
                        <button style={{ ...btnStyle, minHeight: 36, padding: '6px 12px' }} onClick={() => addSlot(t)}>+ Slot</button>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
