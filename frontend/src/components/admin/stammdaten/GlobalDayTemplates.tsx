import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDayTemplates, createDayTemplate, updateDayTemplate, deleteDayTemplate,
  addTemplateWorkArea, updateTemplateWorkArea, deleteTemplateWorkArea, getWorkAreas
} from '../../../api';
import { modal } from '../Modal';
import { btnStyle, inputStyle, minToTime, timeToMin, getTemplateDisplayName } from '../shared';
import type { GlobalDayTemplate, WorkArea, TemplateWorkArea } from '../shared';
import { GanttTimeline, GanttRow } from '../ganttTimeline';

const GRID_MINUTES = 15;

/** Berechne dynamische Zeitachse: frühester Slot − 60min → spätester Slot + 60min */
const computeTimeRange = (workAreas: TemplateWorkArea[]) => {
  if (!workAreas || workAreas.length === 0) return { startMin: 480, endMin: 1200 }; // Default 08:00–20:00
  const allMins = workAreas.flatMap(wa => [wa.startMin, wa.endMin]);
  const min = Math.min(...allMins);
  const max = Math.max(...allMins);
  return { startMin: Math.floor((min - 60) / GRID_MINUTES) * GRID_MINUTES, endMin: Math.ceil((max + 60) / GRID_MINUTES) * GRID_MINUTES };
};

export default function GlobalDayTemplates({ adminPrimary = '#6c757d' }: { adminPrimary?: string }) {
  const qc = useQueryClient();
  const { data: templates = [] } = useQuery<GlobalDayTemplate[]>({ queryKey: ['day-templates'], queryFn: getDayTemplates });
  const { data: workAreas = [] } = useQuery<WorkArea[]>({ queryKey: ['work-areas'], queryFn: getWorkAreas });

  const [newName, setNewName] = useState('');
  const [showWorkAreas, setShowWorkAreas] = useState<Record<number, boolean>>({});
  const [editingTemplateIds, setEditingTemplateIds] = useState<Set<number>>(new Set());
  const [showAddDropdown, setShowAddDropdown] = useState<Record<number, boolean>>({});
  const [backupTimes, setBackupTimes] = useState<Record<number, { workAreaId: number; startMin: number; endMin: number }[]>>({});
  const [editingName, setEditingName] = useState<Record<number, string>>({});
  const [selectedWorkAreas, setSelectedWorkAreas] = useState<Record<number, number[]>>({});
  const [showObsolete, setShowObsolete] = useState(false);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['day-templates'] });

  // Kategorien für Filter extrahieren
  const categories = Array.from(new Set(workAreas.flatMap(wa => (wa.categories || []).map(c => c.name)))).sort();

  // Templates filtern
  const filteredTemplates = templates.filter(t => {
    // Obsolet ausblenden wenn nicht gewünscht
    if (!showObsolete && t.isObsolete) return false;
    
    // Kategorie-Filter: Template muss ALLE ausgewählten Kategorien abdecken (AND)
    if (filterCategories.length > 0) {
      const templateCats = new Set(
        (t.workAreas || [])
          .map(twa => workAreas.find(w => w.id === twa.workAreaId))
          .filter(Boolean)
          .flatMap(wa => (wa as WorkArea).categories || [])
          .map(c => c.name)
      );
      const allMatch = filterCategories.every(cat => templateCats.has(cat));
      if (!allMatch) return false;
    }
    
    return true;
  });

  const toggleEdit = async (id: number) => {
    setEditingTemplateIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Bereits im Bearbeitungsmodus – nichts tun
        return next;
      } else {
        // Backup der aktuellen Zeiten erstellen
        const template = templates.find(t => t.id === id);
        if (template) {
          const workAreas = template.workAreas || [];
          setBackupTimes(prev => ({
            ...prev,
            [id]: workAreas.map(wa => ({ workAreaId: wa.workAreaId, startMin: wa.startMin, endMin: wa.endMin }))
          }));
          // Name für Bearbeitung vorbereiten
          setEditingName(prev => ({ ...prev, [id]: template.name }));
        }
        next.add(id);
        return next;
      }
    });
  };

  const addTemplate = async () => {
    if (!newName.trim()) return;
    await createDayTemplate({ name: newName.trim() });
    setNewName('');
    refresh();
  };

  const duplicateTemplate = async (t: GlobalDayTemplate) => {
    try {
      const newT = await createDayTemplate({ name: `${t.name} (Kopie)` });
      
      // Alle Slots ohne Konfliktprüfung kopieren
      for (const twa of t.workAreas || []) {
        await addTemplateWorkArea({
          templateId: (newT as any).id,
          workAreaId: twa.workAreaId,
          startMin: twa.startMin,
          endMin: twa.endMin,
          order: twa.order,
          skipConflictCheck: true
        });
      }
      
      setEditingTemplateIds(prev => new Set([...prev, (newT as any).id]));
      refresh();
    } catch (err: any) {
      console.error('Duplizieren fehlgeschlagen:', err);
      modal.alert({ title: 'Fehler', message: `Vorlage konnte nicht dupliziert werden: ${err.message || 'Unbekannter Fehler'}` });
    }
  };

  const removeTemplate = async (t: GlobalDayTemplate) => {
    if (!(await modal.confirm({ title: 'Vorlage löschen', message: `Vorlage "${t.name}" inkl. Arbeitsbereiche löschen?`, variant: 'danger' }))) return;
    await deleteDayTemplate(t.id);
    refresh();
  };

  const addWorkAreaToTemplate = async (t: GlobalDayTemplate, workAreaId: number) => {
    await addTemplateWorkArea({ templateId: t.id, workAreaId, startMin: timeToMin('09:00'), endMin: timeToMin('13:00') });
    refresh();
  };

  const removeWorkAreaFromTemplate = async (twaId: number) => {
    await deleteTemplateWorkArea(twaId);
    refresh();
  };

  // Baue GanttTimeline-Daten aus Template-Arbeitsbereichen
  const buildGanttRows = (t: GlobalDayTemplate): GanttRow[] => {
    const workAreasMap = new Map<number, { wa: WorkArea; slots: TemplateWorkArea[] }>();
    
    for (const twa of t.workAreas || []) {
      const wa = workAreas.find(w => w.id === twa.workAreaId);
      if (!wa) continue;
      
      let entry = workAreasMap.get(twa.workAreaId);
      if (!entry) {
        entry = { wa, slots: [] };
        workAreasMap.set(twa.workAreaId, entry);
      }
      entry.slots.push(twa);
    }
    
    const rows: GanttRow[] = [];
    for (const [waId, data] of workAreasMap) {
      const slots = data.slots.sort((a, b) => a.startMin - b.startMin);
      rows.push({
        id: waId,
        label: `${data.wa.icon} ${data.wa.name}`,
        color: data.wa.color || '#3b98f8',
        items: slots.map(s => ({ id: s.id, startMin: s.startMin, endMin: s.endMin }))
      });
    }
    
    // Sortiere nach dem order-Feld der Arbeitsbereiche
    return rows.sort((a, b) => {
      const waA = workAreas.find(w => w.id === a.id);
      const waB = workAreas.find(w => w.id === b.id);
      return (waA?.order ?? 999) - (waB?.order ?? 999);
    });
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ margin: '0 0 4px 0', color: '#212557' }}>📅 Tag-Vorlagen</h3>
      <p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>
        Vorlagen für Tag-Typen (z. B. Aufbautag, Turniertag). Jede Vorlage definiert Arbeitsbereiche mit ihren Zeiten. Ziehe Balken im Chart zum Ändern der Zeiten.
      </p>

      {/* Neue Vorlage */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '16px 0' }}>
        <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>📝 Name</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input style={{ ...inputStyle, flex: 1, minWidth: 200 }} placeholder="z. B. Turniertag" value={newName}
            onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTemplate()} />
          <button style={{ ...btnStyle, background: adminPrimary, color: '#fff', minHeight: 44 }} onClick={addTemplate}><span style={{ fontSize: 18, fontWeight: 'bold', lineHeight: 1 }}>+</span> Hinzufügen</button>
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#666' }}>🏷️ Kategorien:</span>
            {categories.map(cat => (
              <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, cursor: 'pointer', padding: '2px 8px', borderRadius: 4, background: filterCategories.includes(cat) ? '#e7f1ff' : 'transparent', border: `1px solid ${filterCategories.includes(cat) ? '#b6d4fe' : 'transparent'}` }}>
                <input
                  type="checkbox"
                  checked={filterCategories.includes(cat)}
                  onChange={() => setFilterCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                />
                {cat}
              </label>
            ))}
          </div>
        )}
        
        <span style={{ flex: 1 }} />
        
        <button
          style={{ ...btnStyle, minHeight: 36, fontSize: 13, background: showObsolete ? '#fff3cd' : '#e9ecef', color: showObsolete ? '#664d03' : '#495057' }}
          onClick={() => setShowObsolete(prev => !prev)}
        >
          {showObsolete ? '👁️ Veraltete anzeigen' : '🙈 Veraltete ausblenden'}
        </button>
      </div>

      {filteredTemplates.length === 0 && <p style={{ color: '#888' }}>Keine Vorlagen gefunden.</p>}

      {filteredTemplates.map(t => {
        const isEditing = editingTemplateIds.has(t.id);
        const timeRange = computeTimeRange(t.workAreas || []);
        const rows = buildGanttRows(t);

        return (
          <div key={t.id} style={{ border: '1px solid #e9ecef', borderRadius: 12, padding: 16, marginBottom: 16, opacity: t.isObsolete ? 0.6 : 1 }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {!isEditing && (
                <strong style={{ fontSize: 16 }}>{getTemplateDisplayName(t)}</strong>
              )}

              {t.isObsolete && !isEditing && <span style={{ fontSize: 12, color: '#dc3545' }}>obsolet</span>}
              
              {/* Im Bearbeitungsmodus: Name */}
              {isEditing && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 13, color: '#666' }}>📝</span>
                  <input
                    style={{ ...inputStyle, padding: '4px 8px', width: 200, fontSize: 14 }}
                    value={editingName[t.id] || t.name}
                    onChange={e => setEditingName(prev => ({ ...prev, [t.id]: e.target.value }))}
                    onKeyDown={async e => {
                      if (e.key === 'Enter') {
                        const newName = editingName[t.id]?.trim();
                        if (newName && newName !== t.name) {
                          await updateDayTemplate(t.id, { name: newName });
                          refresh();
                        }
                      }
                    }}
                    onBlur={async () => {
                      const newName = editingName[t.id]?.trim();
                      if (newName && newName !== t.name) {
                        await updateDayTemplate(t.id, { name: newName });
                        refresh();
                      }
                    }}
                  />
                </div>
              )}
              
              <span style={{ flex: 1 }} />
              
              {/* Nicht im Bearbeitungsmodus */}
              {!isEditing && (
                <>
                  <button style={{ ...btnStyle, background: '#f8d7da', color: '#842029', minHeight: 36, padding: '6px 12px' }} onClick={() => removeTemplate(t)}>🗑️ Löschen</button>
                  <button style={{ ...btnStyle, background: '#f8f9fa', color: '#0d6efd', minHeight: 36, padding: '6px 12px', border: '1px solid #dee2e6' }} onClick={() => duplicateTemplate(t)}>📑 Duplizieren</button>
                  <button 
                    style={{ ...btnStyle, background: '#e7f1ff', color: '#0d6efd', minHeight: 36, padding: '6px 12px', border: '1px solid #b6d4fe' }}
                    onClick={() => toggleEdit(t.id)}
                  >
                    ✏️ Bearbeiten
                  </button>
                </>
              )}
              
              {/* Im Bearbeitungsmodus: Obsolet + Abbrechen + Fertig */}
              {isEditing && (
                <>
                  <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input type="checkbox" checked={t.isObsolete} onChange={async e => { await updateDayTemplate(t.id, { isObsolete: e.target.checked }); refresh(); }} />
                    🏷️ Obsolet
                  </label>
                  
                  <button 
                    style={{ ...btnStyle, background: '#fff3cd', color: '#664d03', minHeight: 36, padding: '6px 12px', border: '1px solid #ffecb5' }}
                    onClick={async () => {
                      // Backup-Zeiten wiederherstellen
                      const backup = backupTimes[t.id];
                      if (backup) {
                        for (const twa of t.workAreas || []) {
                          const orig = backup.find(b => b.workAreaId === twa.workAreaId);
                          if (orig && (orig.startMin !== twa.startMin || orig.endMin !== twa.endMin)) {
                            await updateTemplateWorkArea(twa.id, { startMin: orig.startMin, endMin: orig.endMin });
                          }
                        }
                      }
                      // Cache aktualisieren damit UI sofort aktualisiert wird
                      qc.setQueryData(['day-templates'], (old: GlobalDayTemplate[] | undefined) => {
                        if (!old) return old;
                        return old.map(tmpl => tmpl.id === t.id && backup ? {
                          ...tmpl,
                          workAreas: (tmpl.workAreas || []).map((twa: TemplateWorkArea) => {
                            const orig = backup.find(b => b.workAreaId === twa.workAreaId);
                            return orig ? { ...twa, startMin: orig.startMin, endMin: orig.endMin } : twa;
                          })
                        } : tmpl);
                      });
                      setEditingTemplateIds(prev => { const next = new Set(prev); next.delete(t.id); return next; });
                      setEditingName(prev => { const next = { ...prev }; delete next[t.id]; return next; });
                    }}
                  >
                    ↩ Abbrechen
                  </button>
                  
                  <button 
                    style={{ ...btnStyle, background: '#d1e7dd', color: '#0f5132', minHeight: 36, padding: '6px 12px', border: '1px solid #badbcc' }}
                    onClick={() => {
                      setEditingTemplateIds(prev => { const next = new Set(prev); next.delete(t.id); return next; });
                      setEditingName(prev => { const next = { ...prev }; delete next[t.id]; return next; });
                    }}
                  >
                    ✓ Fertig
                  </button>
                </>
              )}
            </div>

            {/* Gantt-Ansicht – gemeinsame Komponente */}
            <GanttTimeline
              globalStartMin={timeRange.startMin}
              globalEndMin={timeRange.endMin}
              rows={rows}
              editable={isEditing}
              timeEditMode={isEditing}
              onTimeChange={async (twaId: number, startMin: number, endMin: number) => {
                // Optimistisch im Cache verschieben, damit der Balken nicht
                // zurueckspringt, waehrend der Request laeuft.
                qc.setQueryData(['day-templates'], (old: GlobalDayTemplate[] | undefined) => {
                  if (!old) return old;
                  return old.map(tmpl => ({
                    ...tmpl,
                    workAreas: (tmpl.workAreas || []).map((twa: TemplateWorkArea) =>
                      twa.id === twaId ? { ...twa, startMin, endMin } : twa
                    )
                  }));
                });
                try {
                  await updateTemplateWorkArea(twaId, { startMin, endMin });
                } catch (err: any) {
                  // Ohne dieses Zurueckrollen bliebe der Balken an der neuen
                  // Position stehen, obwohl der Server sie abgelehnt hat (z.B.
                  // Ueberschneidung) - die Ansicht wuerde die DB belügen.
                  refresh();
                  await modal.alert({
                    title: 'Verschieben nicht möglich',
                    message: err?.message || 'Der Zeitraum konnte nicht gespeichert werden.'
                  });
                }
              }}
              onDelete={async (twaId: number) => {
                await removeWorkAreaFromTemplate(twaId);
              }}
              onAddSlot={async (rowId: number) => {
                // Finde die WorkArea für diese Row
                const wa = workAreas.find(w => w.id === rowId);
                if (!wa) return;
                
                // Versuche nicht-kollidierende Zeiten zu finden
                const existingSlots = t.workAreas?.filter(s => s.workAreaId === rowId) || [];
                let startMin = timeToMin('13:00');
                let endMin = timeToMin('17:00');
                
                // Default-Zeiten die wahrscheinlich keinen Konflikt haben
                const candidates = [
                  { start: timeToMin('06:00'), end: timeToMin('10:00') },
                  { start: timeToMin('18:00'), end: timeToMin('22:00') },
                  { start: timeToMin('22:00'), end: timeToMin('02:00') }, // über Mitternacht
                ];
                
                for (const cand of candidates) {
                  let s = cand.start;
                  let e = cand.end;
                  if (e <= s) { e += 1440; } // über Mitternacht
                  
                  // Prüfe ob dieser Kandidat mit bestehenden Slots kollidiert
                  const hasConflict = existingSlots.some(slot => {
                    return slot.startMin < e && slot.endMin > s;
                  });
                  if (!hasConflict) {
                    startMin = s;
                    endMin = e;
                    break;
                  }
                }
                
                // Fallback: nach dem letzten Slot appenden
                if (existingSlots.length > 0) {
                  const lastEnd = Math.max(...existingSlots.map(s => s.endMin));
                  startMin = lastEnd;
                  endMin = lastEnd + 240;
                  if (endMin > 1440) { endMin -= 1440; }
                }
                
                try {
                  await addTemplateWorkArea({
                    templateId: t.id,
                    workAreaId: wa.id,
                    startMin,
                    endMin,
                    order: (t.workAreas || []).length
                  });
                  refresh();
                } catch (err: any) {
                  if (err.message?.includes('überschneidet')) {
                    modal.alert({ title: 'Fehler', message: 'Alle Zeiten kollidieren mit bestehenden Slots. Bitte ziehe einen Balken manuell.' });
                  }
                }
              }}
            />

            {/* Arbeitsbereich hinzufügen – immer sichtbar im Bearbeitungsmodus */}
            {isEditing && (
              <div style={{ marginTop: 12, position: 'relative' }}>
                <button 
                  style={{ ...btnStyle, background: '#e7f1ff', color: '#0d6efd', minHeight: 36, padding: '6px 12px', border: '1px solid #b6d4fe' }}
                  onClick={() => setShowAddDropdown(prev => ({ ...prev, [t.id]: !prev[t.id] }))}
                >
                  ➕ Arbeitsbereich hinzufügen
                </button>
                
                {showAddDropdown[t.id] && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 100, maxHeight: 300, overflowY: 'auto' }}>
                    {(() => {
                      const assignedIds = new Set((t.workAreas || []).map(wa => wa.workAreaId));
                      const available = workAreas.filter(wa => !assignedIds.has(wa.id));
                      if (available.length === 0) return <div style={{ padding: '12px 16px', color: '#888', fontSize: 13 }}>Alle Arbeitsbereiche sind bereits zugewiesen</div>;
                      
                      const selected = selectedWorkAreas[t.id] || [];
                      
                      return (
                        <>
                          {available.map(wa => (
                            <label
                              key={wa.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                padding: '8px 16px', cursor: 'pointer', fontSize: 13, color: '#212557',
                                borderBottom: '1px solid #f0f0f0'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selected.includes(wa.id)}
                                onChange={() => {
                                  setSelectedWorkAreas(prev => ({
                                    ...prev,
                                    [t.id]: prev[t.id]?.includes(wa.id)
                                      ? prev[t.id].filter(id => id !== wa.id)
                                      : [...(prev[t.id] || []), wa.id]
                                  }));
                                }}
                              />
                              <span style={{ fontSize: 16 }}>{wa.icon}</span>
                              <span>{wa.name}</span>
                            </label>
                          ))}
                          {selected.length > 0 && (
                            <div style={{ padding: '8px 16px', borderTop: '2px solid #dee2e6' }}>
                              <button
                                style={{ ...btnStyle, background: '#d1e7dd', color: '#0f5132', width: '100%', minHeight: 36 }}
                                onClick={async () => {
                                  const selected = selectedWorkAreas[t.id] || [];
                                  for (const waId of selected) {
                                    await addTemplateWorkArea({
                                      templateId: t.id,
                                      workAreaId: waId,
                                      startMin: timeToMin('09:00'),
                                      endMin: timeToMin('13:00'),
                                      order: (t.workAreas || []).length
                                    });
                                  }
                                  setSelectedWorkAreas(prev => ({ ...prev, [t.id]: [] }));
                                  setShowAddDropdown(prev => ({ ...prev, [t.id]: false }));
                                  refresh();
                                }}
                              >
                                ➕ {selected.length} Arbeitsbereich{selected.length > 1 ? 'e' : ''} hinzufügen
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
