import { useState, Fragment } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shift, VolunteerShift, FoodDonationSlot, thStyle, tdStyle, minToTime } from '../shared';
import { getShifts, getVolunteerShifts, getFoodDonationSlots, getVolunteers, apiPost, apiDelete } from '../../../api';
import { modal } from '../Modal';
import ShiftFeedbackModal from './ShiftFeedbackModal';

export default function Uebersicht({ selectedTournament }: { selectedTournament: number | null }) {
  const queryClient = useQueryClient();
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedVolunteerToAssign, setSelectedVolunteerToAssign] = useState<number | ''>('');
  const [assigning, setAssigning] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const { data: allVolunteers = [] } = useQuery<any[]>({
    queryKey: ['volunteers', selectedTournament],
    queryFn: () => getVolunteers(selectedTournament),
    enabled: !!selectedTournament
  });

  const { data: jobSlots = [], isLoading: busySlots } = useQuery<Shift[]>({
    queryKey: ['shifts', selectedTournament],
    queryFn: () => getShifts(selectedTournament),
    enabled: !!selectedTournament,
    refetchInterval: 10000 // alle 10 Sekunden automatisch aktualisieren
  });

  const { data: volunteerShifts = [], isLoading: busyVolShifts } = useQuery<VolunteerShift[]>({
    queryKey: ['volunteerShifts', selectedTournament],
    queryFn: () => getVolunteerShifts(selectedTournament),
    enabled: !!selectedTournament,
    refetchInterval: 5000 // alle 5 Sekunden automatisch aktualisieren
  });

  const { data: foodSlots = [], isLoading: busyFood } = useQuery<FoodDonationSlot[]>({
    queryKey: ['foodDonationSlots', selectedTournament],
    queryFn: () => getFoodDonationSlots(selectedTournament),
    enabled: !!selectedTournament
  });

  if (!selectedTournament) {
    return (
      <div style={{ padding: 48, textAlign: 'center', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📊</div>
        <div style={{ fontSize: 20, fontWeight: '600', marginBottom: 8, color: '#212529' }}>Bitte ein Turnier auswählen</div>
        <div style={{ fontSize: 14, color: '#666' }}>Wähle oben ein Turnier aus, um die Übersicht zu sehen</div>
      </div>
    );
  }

  if (busySlots || busyVolShifts || busyFood) {
    return <div style={{ textAlign: 'center', padding: 20 }}>⏳ Lade Daten...</div>;
  }

  if (jobSlots.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#666', background: '#fff', borderRadius: 16 }}>Bisher keine Job-Slots für dieses Turnier angelegt.</div>;
  }

  const grouped: Record<string, any[]> = {};
  jobSlots.sort((a: any, b: any) => {
    const dateA = a.day?.date || a.date;
    const dateB = b.day?.date || b.date;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  }).forEach((slot: any) => {
    const dateVal = slot.day?.date || slot.date;
    const dateKey = new Date(dateVal).toLocaleDateString('de-DE');
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(slot);
  });

  const unbesetzteSlots = jobSlots.filter(s => {
    const count = volunteerShifts.filter(vs => vs.shiftId === s.id).length;
    return count < s.maxVolunteers;
  });

  const fehlendeVerpflegung = foodSlots.filter(f => f.collected < f.targetQuantity);

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>📊 Management Buchungen (Übersicht)</h3>
        <button onClick={() => setShowFeedbackModal(true)} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#ffc107', color: '#000', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
          <span>⭐</span> Helfer-Feedback & Learnings
        </button>
      </div>
      
      {/* Offene Punkte Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 32 }}>
        {unbesetzteSlots.length > 0 && (
          <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', padding: 16, borderRadius: 12 }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>⚠️ <strong style={{ color: '#856404' }}>{unbesetzteSlots.length} unbesetzte Job-Slots</strong></div>
            <p style={{ margin: 0, fontSize: 14, color: '#856404' }}>Es fehlen noch Helfer in verschiedenen Schichten. Bitte Dienstplan prüfen.</p>
          </div>
        )}
        {fehlendeVerpflegung.length > 0 && (
          <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', padding: 16, borderRadius: 12 }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>⚠️ <strong style={{ color: '#721c24' }}>{fehlendeVerpflegung.length} offene Verpflegungs-Ziele</strong></div>
            <p style={{ margin: 0, fontSize: 14, color: '#721c24' }}>Für verschiedene Jahrgänge fehlen noch Kuchen, Salate oder andere Spenden.</p>
          </div>
        )}
        {unbesetzteSlots.length === 0 && fehlendeVerpflegung.length === 0 && jobSlots.length > 0 && (
          <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', padding: 16, borderRadius: 12 }}>
            <div style={{ fontSize: 18, marginBottom: 8 }}>✅ <strong style={{ color: '#155724' }}>Alles besetzt!</strong></div>
            <p style={{ margin: 0, fontSize: 14, color: '#155724' }}>Alle Job-Slots und Verpflegungs-Ziele sind erreicht. Gute Arbeit!</p>
          </div>
        )}
      </div>

      {(() => {
        let globalStartMin = 1440;
        let globalEndMin = 0;
        jobSlots.forEach((s: any) => {
          const st = s.startMin ?? s.daySlot?.startMin ?? 480;
          const en = s.endMin ?? s.daySlot?.endMin ?? 1080;
          globalStartMin = Math.min(globalStartMin, st);
          globalEndMin = Math.max(globalEndMin, en);
        });
        if (globalStartMin > globalEndMin) {
          globalStartMin = 480;
          globalEndMin = 1080;
        }

        return Object.entries(grouped).map(([dateStr, slots]) => {
          const firstSlot = slots[0];
          const firstDate = new Date(firstSlot.day?.date || firstSlot.date);
          const dayName = firstDate.toLocaleDateString('de-DE', { weekday: 'long' });
          slots.sort((a: any, b: any) => (a.startMin ?? a.daySlot?.startMin ?? 0) - (b.startMin ?? b.daySlot?.startMin ?? 0));

          return (
            <OverviewTimeline 
              key={dateStr}
              dateStr={dateStr}
              dayName={dayName}
              slots={slots}
              volunteerShifts={volunteerShifts}
              globalStartMin={globalStartMin}
              globalEndMin={globalEndMin}
              onShiftClick={setSelectedShift}
            />
          );
        });
      })()}

      {/* Modal für Helfer-Details */}
      {selectedShift && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8f9fa' }}>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#212529' }}>
                {(selectedShift as any).workArea?.icon || (selectedShift as any).arbeitsbereich?.icon} {(selectedShift as any).workArea?.name || (selectedShift as any).arbeitsbereich?.name}
              </div>
              <button onClick={() => setSelectedShift(null)} style={{ border: 'none', background: 'transparent', fontSize: 24, lineHeight: 1, cursor: 'pointer', color: '#adb5bd' }}>×</button>
            </div>
            
            <div style={{ padding: 20, overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: 20, marginBottom: 20, color: '#666', fontSize: 14 }}>
                <div>📅 {new Date((selectedShift as any).day?.date || selectedShift.date).toLocaleDateString('de-DE')}</div>
                <div>⏰ {minToTime((selectedShift as any).startMin ?? (selectedShift as any).daySlot?.startMin ?? 0)} - {minToTime((selectedShift as any).endMin ?? (selectedShift as any).daySlot?.endMin ?? 0)}</div>
              </div>

              <h4 style={{ margin: '0 0 12px 0', color: '#212529' }}>Zugewiesene Helfer</h4>
              {(() => {
                const assigned = volunteerShifts.filter(vs => vs.shiftId === selectedShift.id);
                if (assigned.length === 0) return <div style={{ color: '#adb5bd', fontStyle: 'italic' }}>Noch keine Helfer zugewiesen.</div>;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {assigned.map(vs => (
                      <div key={vs.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8f9fa', borderRadius: 8, border: '1px solid #e9ecef' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#0d6efd', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 14 }}>
                            {vs.user?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: '#212529' }}>{vs.user?.name || 'Unbekannt'}</div>
                            {vs.user?.phone && <div style={{ fontSize: 12, color: '#6c757d' }}>📞 {vs.user.phone}</div>}
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            if (!(await modal.confirm({ title: 'Helfer ausplanen', message: `Soll "${vs.user?.name || 'Helfer'}" aus dieser Schicht entfernt werden? Der Helfer erhält eine Web-Push-Benachrichtigung.` }))) return;
                            try {
                              await apiDelete(`/api/volunteer-shifts/${vs.id}`);
                              queryClient.invalidateQueries({ queryKey: ['volunteerShifts'] });
                              await modal.alert({ title: 'Ausgeplant', message: 'Der Helfer wurde aus der Schicht entfernt.' });
                            } catch (err: any) {
                              await modal.alert({ title: 'Fehler', message: err?.message || 'Fehler beim Ausplanen' });
                            }
                          }}
                          style={{ padding: '6px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}
                          title="Aus Schicht entfernen"
                        >
                          ❌ Ausplanen
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e9ecef' }}>
                <h5 style={{ margin: '0 0 10px 0', color: '#212529', fontSize: 14 }}>➕ Helfer in Schicht einplanen</h5>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <select
                    value={selectedVolunteerToAssign}
                    onChange={e => setSelectedVolunteerToAssign(e.target.value ? Number(e.target.value) : '')}
                    style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #ced4da', borderRadius: 8, fontSize: 14 }}
                  >
                    <option value="">-- Helfer auswählen --</option>
                    {allVolunteers
                      .filter(v => !volunteerShifts.some(vs => vs.shiftId === selectedShift.id && vs.userId === v.id))
                      .map(v => (
                        <option key={v.id} value={v.id}>{v.name} {v.email ? `(${v.email})` : ''}</option>
                      ))}
                  </select>
                  <button
                    onClick={async () => {
                      if (!selectedVolunteerToAssign || !selectedShift) return;
                      setAssigning(true);
                      try {
                        const shiftDate = (selectedShift as any).day?.date || selectedShift.date;
                        const startMin = (selectedShift as any).startMin ?? (selectedShift as any).daySlot?.startMin ?? 0;
                        const endMin = (selectedShift as any).endMin ?? (selectedShift as any).daySlot?.endMin ?? 0;
                        const slotLabel = `${minToTime(startMin)}-${minToTime(endMin)}`;
                        const roleName = (selectedShift as any).workArea?.name || (selectedShift as any).arbeitsbereich?.name || 'Helfer';
                        const areaIdStr = (selectedShift as any).tournamentWorkAreaId ? String((selectedShift as any).tournamentWorkAreaId) : null;

                        await apiPost('/api/volunteer-shifts', {
                          userId: Number(selectedVolunteerToAssign),
                          tournamentId: selectedShift.tournamentId || selectedTournament,
                          shiftId: selectedShift.id,
                          date: shiftDate,
                          slot: slotLabel,
                          role: roleName,
                          areaId: areaIdStr
                        });

                        queryClient.invalidateQueries({ queryKey: ['volunteerShifts'] });
                        setSelectedVolunteerToAssign('');
                        await modal.alert({ title: 'Eingeplant ✅', message: 'Der Helfer wurde eingeplant und per Web-Push benachrichtigt!' });
                      } catch (err: any) {
                        await modal.alert({ title: 'Fehler', message: err?.message || 'Fehler beim Einplanen' });
                      } finally {
                        setAssigning(false);
                      }
                    }}
                    disabled={!selectedVolunteerToAssign || assigning}
                    style={{ padding: '8px 16px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 8, cursor: !selectedVolunteerToAssign || assigning ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: !selectedVolunteerToAssign || assigning ? 0.6 : 1 }}
                  >
                    {assigning ? '...' : 'Einplanen'}
                  </button>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '16px 20px', borderTop: '1px solid #e9ecef', background: '#f8f9fa', textAlign: 'right' }}>
              <button onClick={() => setSelectedShift(null)} style={{ padding: '8px 16px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && selectedTournament && (
        <ShiftFeedbackModal 
          tournament={{ id: selectedTournament, name: 'Turnier ' + selectedTournament } as any}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
    </div>
  );
}

function OverviewTimeline({ dateStr, dayName, slots, volunteerShifts, globalStartMin, globalEndMin, onShiftClick }: { dateStr: string, dayName: string, slots: Shift[], volunteerShifts: VolunteerShift[], globalStartMin: number, globalEndMin: number, onShiftClick: (s: Shift) => void }) {
  if (slots.length === 0) return null;
  
  const startHour = Math.floor(globalStartMin / 60);
  const endHour = Math.ceil(globalEndMin / 60);
  
  const dayStart = startHour * 60;
  const dayEnd = endHour * 60;
  const span = Math.max(1, dayEnd - dayStart);
  
  const hours = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push(h);
  }

  // nach Area gruppieren
  const byArea = new Map<number, { name: string; icon: string; color: string; items: any[] }>();
  for (const s of slots as any[]) {
    const key = s.tournamentWorkAreaId || s.arbeitsbereichId;
    if (!byArea.has(key)) byArea.set(key, { name: s.workArea?.name || s.arbeitsbereich?.name || '?', icon: s.workArea?.icon || s.arbeitsbereich?.icon || '📍', color: s.workArea?.color || s.arbeitsbereich?.color || '#3b98f8', items: [] });
    byArea.get(key)!.items.push(s);
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <h4 style={{ background: '#f8f9fa', padding: '14px 18px', borderRadius: 10, marginTop: 0, fontSize: 16, fontWeight: '600', border: '1px solid #e9ecef', marginBottom: 16 }}>
        📅 {dateStr} ({dayName})
        <span style={{ float: 'right', fontSize: 14, color: '#666' }}>{slots.length} Schichten · {slots.reduce((sum, s) => sum + volunteerShifts.filter(vs => vs.shiftId === s.id).length, 0)} Helfer</span>
      </h4>
      
      <div style={{ paddingBottom: 8 }}>
        <div style={{ position: 'relative', paddingRight: 20 }}>
          
          {/* Header mit Uhrzeiten */}
          <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: 160, height: 24, borderBottom: '1px solid #ccc', position: 'relative' }}>
            {hours.map(h => (
              <div key={h} style={{ position: 'absolute', left: `${((h * 60 - dayStart) / span) * 100}%`, transform: 'translateX(-50%)', fontSize: 11, color: '#666', bottom: 4 }}>
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Raster und Balken */}
          <div style={{ position: 'relative', marginLeft: 160 }}>
            {/* Vertikale Linien */}
            <div style={{ position: 'absolute', top: 0, bottom: '100%', minHeight: [...byArea.values()].length * 38 + 16, left: 0, right: 0, pointerEvents: 'none' }}>
              {hours.map(h => (
                <div key={h} style={{ position: 'absolute', left: `${((h * 60 - dayStart) / span) * 100}%`, top: 0, bottom: 0, width: 1, background: '#e9ecef' }} />
              ))}
            </div>

            {/* Zeilen für Arbeitsbereiche */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {[...byArea.values()].map((area, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', height: 32, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -160, width: 150, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{area.icon} {area.name}</div>
                  
                  <div style={{ position: 'relative', width: '100%', height: '100%', background: 'rgba(241, 243, 245, 0.4)', borderRadius: 6 }}>
                    {area.items.map(s => {
                      const st = s.startMin ?? s.daySlot?.startMin ?? 480;
                      const en = s.endMin ?? s.daySlot?.endMin ?? 1080;
                      const left = ((st - dayStart) / span) * 100;
                      const width = ((en - st) / span) * 100;
                      const showTime = width > 15;
                      
                      const assigned = volunteerShifts.filter(vs => vs.shiftId === s.id).length;
                      const isFull = assigned >= (s.maxVolunteers || 1);
                      const hasVolunteers = assigned > 0;
                      const borderColor = isFull ? '#198754' : (hasVolunteers ? '#ffc107' : 'transparent');
                      const shadow = hasVolunteers ? `0 0 0 2px ${borderColor}` : '0 1px 3px rgba(0,0,0,0.2)';
                      const check = isFull ? ' ✓' : '';
                      
                      return (
                        <div key={s.id} onClick={() => onShiftClick(s)} title={`${minToTime(st)}–${minToTime(en)} · ${assigned}/${s.maxVolunteers} Helfer`}
                          style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, top: 2, bottom: 2, background: area.color, borderRadius: 6, boxShadow: shadow, color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', whiteSpace: 'nowrap', padding: '0 4px', boxSizing: 'border-box', cursor: 'pointer', transition: 'transform 0.1s' }}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                          <span style={{ fontWeight: 600, opacity: 0.95 }}>
                            {showTime ? `${minToTime(st)}–${minToTime(en)} (${assigned}/${s.maxVolunteers}${check})` : `(${assigned}/${s.maxVolunteers}${check})`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
