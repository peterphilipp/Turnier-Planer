import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDayTemplates, createDayTemplate, updateDayTemplate, deleteDayTemplate,
  addTemplateSlot, deleteTemplateSlot, setSlotWorkAreas, getWorkAreas
} from '../../../api';
import { modal } from '../Modal';
import { btnStyle, inputStyle, minToTime, timeToMin } from '../shared';
import type { GlobalDayTemplate, GlobalDaySlot, WorkArea } from '../shared';

export default function GlobalDayTemplates({ adminPrimary = '#6c757d' }: { adminPrimary?: string }) {
  const qc = useQueryClient();
  const { data: templates = [] } = useQuery<GlobalDayTemplate[]>({ queryKey: ['day-templates'], queryFn: getDayTemplates });
  const { data: workAreas = [] } = useQuery<WorkArea[]>({ queryKey: ['work-areas'], queryFn: getWorkAreas });

  const [newName, setNewName] = useState('');
  const [slotDraft, setSlotDraft] = useState<Record<number, { start: string; end: string; label: string }>>({});
  const refresh = () => qc.invalidateQueries({ queryKey: ['day-templates'] });

  const addTemplate = async () => {
    if (!newName.trim()) return;
    await createDayTemplate(newName.trim());
    setNewName('');
    refresh();
  };

  const removeTemplate = async (t: GlobalDayTemplate) => {
    if (!(await modal.confirm({ title: 'Vorlage löschen', message: `Vorlage "${t.name}" inkl. Slots löschen?`, variant: 'danger' }))) return;
    await deleteDayTemplate(t.id);
    refresh();
  };

  const addSlot = async (templateId: number) => {
    const d = slotDraft[templateId] || { start: '09:00', end: '12:00', label: '' };
    const startMin = timeToMin(d.start);
    const endMin = timeToMin(d.end);
    if (endMin <= startMin) { await modal.alert({ title: 'Hinweis', message: 'Ende muss nach dem Start liegen.' }); return; }
    await addTemplateSlot({ templateId, startMin, endMin, label: d.label || null });
    setSlotDraft(prev => ({ ...prev, [templateId]: { start: '09:00', end: '12:00', label: '' } }));
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

      {templates.map(t => (
        <div key={t.id} style={{ border: '1px solid #e9ecef', borderRadius: 12, padding: 16, marginBottom: 16, opacity: t.isObsolete ? 0.6 : 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 16 }}>{t.name}</strong>
            {t.isObsolete && <span style={{ fontSize: 12, color: '#dc3545' }}>obsolet</span>}
            <span style={{ flex: 1 }} />
            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={t.isObsolete} onChange={async e => { await updateDayTemplate(t.id, { isObsolete: e.target.checked }); refresh(); }} />
              obsolet
            </label>
            <button style={{ ...btnStyle, background: '#f8d7da', color: '#842029', minHeight: 36, padding: '6px 12px' }} onClick={() => removeTemplate(t)}>Löschen</button>
          </div>

          {/* Slots */}
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(t.slots || []).map(slot => (
              <div key={slot.id} style={{ background: '#f8f9fa', borderRadius: 8, padding: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600 }}>{minToTime(slot.startMin)}–{minToTime(slot.endMin)}</span>
                  {slot.label && <span style={{ color: '#666', fontSize: 13 }}>{slot.label}</span>}
                  <span style={{ flex: 1 }} />
                  <button style={{ ...btnStyle, background: 'transparent', color: '#842029', minHeight: 32, padding: '4px 10px' }} onClick={() => removeSlot(slot.id)}>✕</button>
                </div>
                {/* WorkArea-Zuordnung */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {workAreas.map(wa => {
                    const checked = (slot.workAreas || []).some(w => w.workAreaId === wa.id);
                    return (
                      <label key={wa.id} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, background: checked ? '#e7f1ff' : '#fff', border: '1px solid #dee2e6', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={checked} onChange={e => toggleWorkArea(slot, wa.id, e.target.checked)} />
                        {wa.icon} {wa.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Neuer Slot */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
              <input type="time" style={inputStyle} value={slotDraft[t.id]?.start ?? '09:00'}
                onChange={e => setSlotDraft(p => ({ ...p, [t.id]: { ...(p[t.id] || { start: '09:00', end: '12:00', label: '' }), start: e.target.value } }))} />
              <span>–</span>
              <input type="time" style={inputStyle} value={slotDraft[t.id]?.end ?? '12:00'}
                onChange={e => setSlotDraft(p => ({ ...p, [t.id]: { ...(p[t.id] || { start: '09:00', end: '12:00', label: '' }), end: e.target.value } }))} />
              <input style={{ ...inputStyle, width: 160 }} placeholder="Label (optional)" value={slotDraft[t.id]?.label ?? ''}
                onChange={e => setSlotDraft(p => ({ ...p, [t.id]: { ...(p[t.id] || { start: '09:00', end: '12:00', label: '' }), label: e.target.value } }))} />
              <button style={{ ...btnStyle, minHeight: 36, padding: '6px 12px' }} onClick={() => addSlot(t.id)}>+ Slot</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
