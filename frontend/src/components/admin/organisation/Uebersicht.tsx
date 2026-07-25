import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shift, VolunteerShift, FoodDonationSlot, minToTime } from '../shared';
import { getShifts, getVolunteerShifts, getFoodDonationSlots, getVolunteers, apiPost, apiDelete, updateShiftsBatch } from '../../../api';
import { modal } from '../Modal';
import ShiftFeedbackModal from './ShiftFeedbackModal';
import ShiftTimeline from './ShiftTimeline';

/** Liefert die aktuelle Fensterbreite und aktualisiert bei Resize. */
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

export default function Uebersicht({ selectedTournament }: { selectedTournament: number | null }) {
  const queryClient = useQueryClient();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedVolunteerToAssign, setSelectedVolunteerToAssign] = useState<number | ''>('');
  const [assigning, setAssigning] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  // Für Accordion: Set von aufgeklappten Datums-Keys
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  // Editiermodus für Zeiten: Änderungen werden lokal gesammelt (keyed by
  // Shift-ID) und erst per Commit als eine Business-Transaktion übernommen.
  const [timeEditMode, setTimeEditMode] = useState(false);
  const [pendingTimeChanges, setPendingTimeChanges] = useState<Record<number, { startMin: number; endMin: number }>>({});
  const [committing, setCommitting] = useState(false);
  const pendingCount = Object.keys(pendingTimeChanges).length;

  // Turnierwechsel: offene, nicht committete Änderungen würden sich sonst auf
  // Shift-IDs eines nicht mehr sichtbaren Turniers beziehen.
  useEffect(() => {
    setTimeEditMode(false);
    setPendingTimeChanges({});
  }, [selectedTournament]);


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


  /**
   * Zeiten einer Schicht anpassen. Liegt hier (nicht mehr im Generator): der
   * Dienstplan ist der Ort, an dem der bestehende Plan gepflegt wird –
   * Besetzung UND Zeiten. Der Generator erzeugt nur.
   *
   * Zeit-Änderungen laufen über einen expliziten Editiermodus statt sofort
   * bei jedem Ziehen zu speichern: mehrere Anpassungen (z. B. eine Schicht
   * verkürzen, weil eine andere verlängert wird) werden gesammelt und erst
   * per Commit als eine Transaktion übernommen. Das vermeidet einen
   * Zwischenzustand, der später unnötige/widersprüchliche Benachrichtigungen
   * an eingeplante Helfer auslösen würde.
   */
  const handleStageShiftTime = (shiftId: number, startMin: number, endMin: number) => {
    setPendingTimeChanges(prev => ({ ...prev, [shiftId]: { startMin, endMin } }));
  };

  const handleDiscardTimeChanges = async () => {
    if (pendingCount > 0) {
      const ok = await modal.confirm({
        title: 'Änderungen verwerfen?',
        message: `${pendingCount} ungespeicherte Zeit-Änderung${pendingCount === 1 ? '' : 'en'} ${pendingCount === 1 ? 'geht' : 'gehen'} verloren.`,
        confirmText: 'Verwerfen',
        cancelText: 'Zurück',
        variant: 'warning'
      });
      if (!ok) return;
    }
    setPendingTimeChanges({});
    setTimeEditMode(false);
  };

  const handleCommitTimeChanges = async () => {
    if (pendingCount === 0) {
      setTimeEditMode(false);
      return;
    }
    const ok = await modal.confirm({
      title: 'Zeiten übernehmen?',
      message: `${pendingCount} Schicht${pendingCount === 1 ? '' : 'en'} ${pendingCount === 1 ? 'wird' : 'werden'} mit neuer Zeit gespeichert. Eingeplante Helfer sehen die neue Zeit im Dienstplan.`,
      confirmText: 'Übernehmen',
      cancelText: 'Abbrechen'
    });
    if (!ok) return;

    setCommitting(true);
    try {
      const changes = Object.entries(pendingTimeChanges).map(([id, c]) => ({ id: Number(id), ...c }));
      await updateShiftsBatch(changes);
      queryClient.invalidateQueries({ queryKey: ['shifts', selectedTournament] });
      setPendingTimeChanges({});
      setTimeEditMode(false);
      await modal.alert({ title: 'Gespeichert ✅', message: `${changes.length} Schicht${changes.length === 1 ? '' : 'en'} aktualisiert.` });
    } catch (err: any) {
      await modal.alert({ title: 'Fehler', message: err?.message || 'Änderungen konnten nicht gespeichert werden. Es wurde nichts übernommen.' });
    } finally {
      setCommitting(false);
    }
  };

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
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>📋 Dienstplan</h3>
        <button onClick={() => setShowFeedbackModal(true)} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#ffc107', color: '#000', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
          <span>⭐</span> Helfer-Feedback & Learnings
        </button>
      </div>

      {/* Offene Punkte Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
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

      {/* Editiermodus-Toolbar: Zeiten sind standardmäßig gesperrt (nur Helfer
          ein-/ausplanen ist ohne Umschalten möglich). Erst hier freigeschaltet
          lassen sich Balken ziehen; verlassen geht nur über Commit oder Verwerfen.
          Bewusst UNTER den Status-Boxen (unbesetzte Job-Slots/offene
          Verpflegungsziele), damit die Statusübersicht als Erstes ins Auge fällt. */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        marginBottom: 32, padding: '10px 16px', borderRadius: 10,
        background: timeEditMode ? '#fff3cd' : '#f8f9fa',
        border: `1px solid ${timeEditMode ? '#ffe69c' : '#dee2e6'}`
      }}>
        {!timeEditMode ? (
          <>
            <span style={{ fontSize: 13, color: '#495057' }}>🔒 Schicht-Zeiten sind gesperrt</span>
            <button
              onClick={() => setTimeEditMode(true)}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ced4da', background: '#fff', color: '#212529', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
            >
              ✏️ Zeiten bearbeiten
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#856404' }}>✏️ Bearbeitungsmodus aktiv – Ränder ziehen zum Anpassen</span>
            <span style={{ fontSize: 13, color: '#856404' }}>
              {pendingCount === 0 ? 'Noch keine Änderungen' : `${pendingCount} Änderung${pendingCount === 1 ? '' : 'en'} ausstehend`}
            </span>
            <span style={{ flex: 1 }} />
            <button
              onClick={handleDiscardTimeChanges}
              disabled={committing}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ced4da', background: '#fff', color: '#495057', fontWeight: 600, cursor: committing ? 'not-allowed' : 'pointer', fontSize: 13, opacity: committing ? 0.6 : 1 }}
            >
              ✖️ Verwerfen
            </button>
            <button
              onClick={handleCommitTimeChanges}
              disabled={committing}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#198754', color: '#fff', fontWeight: 600, cursor: committing ? 'not-allowed' : 'pointer', fontSize: 13, opacity: committing ? 0.6 : 1 }}
            >
              {committing ? '...' : `✅ Übernehmen${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
            </button>
          </>
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
          const totalHelfer = slots.reduce((sum: number, s: any) => sum + volunteerShifts.filter(vs => vs.shiftId === s.id).length, 0);
          const isExpanded = expandedDays.has(dateStr);

          if (isMobile) {
            // Mobile: aufklappbares Accordion pro Tag
            return (
              <div key={dateStr} style={{ marginBottom: 12, border: '1px solid #e9ecef', borderRadius: 12, overflow: 'hidden' }}>
                <button
                  onClick={() => {
                    setExpandedDays(prev => {
                      const next = new Set(prev);
                      if (next.has(dateStr)) next.delete(dateStr);
                      else next.add(dateStr);
                      return next;
                    });
                  }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: isExpanded ? '#0d6efd' : '#f8f9fa', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 8 }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: isExpanded ? '#fff' : '#212529' }}>📅 {dateStr} – {dayName}</div>
                    <div style={{ fontSize: 12, color: isExpanded ? 'rgba(255,255,255,0.8)' : '#6c757d', marginTop: 2 }}>{slots.length} Schichten · {totalHelfer} Helfer zugewiesen</div>
                  </div>
                  <span style={{ fontSize: 20, color: isExpanded ? '#fff' : '#6c757d', transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
                </button>
                {isExpanded && (
                  <div style={{ background: '#fff' }}>
                    {slots.map((s: any) => {
                      const assigned = volunteerShifts.filter(vs => vs.shiftId === s.id);
                      const startMin = s.startMin ?? s.daySlot?.startMin ?? 0;
                      const endMin = s.endMin ?? s.daySlot?.endMin ?? 0;
                      const areaName = (s.workArea?.name || s.arbeitsbereich?.name || 'Schicht');
                      const areaIcon = (s.workArea?.icon || s.arbeitsbereich?.icon || '📌');
                      const isFull = assigned.length >= s.maxVolunteers;
                      return (
                        <div key={s.id} style={{ borderTop: '1px solid #e9ecef', padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: '#212529' }}>{areaIcon} {areaName}</div>
                              <div style={{ fontSize: 12, color: '#6c757d' }}>⏰ {minToTime(startMin)} – {minToTime(endMin)}</div>
                              <div style={{ fontSize: 12, color: isFull ? '#155724' : '#856404', marginTop: 2 }}>
                                {isFull ? '✅' : '⚠️'} {assigned.length}/{s.maxVolunteers} besetzt
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedShift(s as any)}
                              style={{ minWidth: 44, minHeight: 44, padding: '8px 14px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, flexShrink: 0 }}
                            >
                              👥 Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Tablet/Desktop: bestehende Timeline
          return (
            <ShiftTimeline
              key={dateStr}
              title={`📅 ${dateStr} (${dayName})`}
              subtitle={
                <span style={{ fontSize: 12, color: '#6c757d', background: '#f8f9fa', padding: '2px 8px', borderRadius: 4, border: '1px solid #dee2e6' }}>
                  {slots.length} Schichten · {totalHelfer} Helfer
                  {' · '}💡 {timeEditMode ? 'Ränder ziehen = Zeiten anpassen, dann oben übernehmen' : 'Balken antippen = Helfer'}
                </span>
              }
              shifts={slots as any}
              volunteerShifts={volunteerShifts}
              globalStartMin={globalStartMin}
              globalEndMin={globalEndMin}
              editable
              timeEditMode={timeEditMode}
              overrides={pendingTimeChanges}
              onShiftClick={s => setSelectedShift(s as any)}
              onStageShiftTime={handleStageShiftTime}
            />
          );
        });
      })()}


      {/* Modal für Helfer-Details */}
      {selectedShift && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 20 }}>
          <div style={{ background: '#fff', borderRadius: isMobile ? '16px 16px 0 0' : 16, width: '100%', maxWidth: isMobile ? undefined : 500, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: isMobile ? '92vh' : '90vh' }}>

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
                          style={{ minWidth: 44, minHeight: 44, padding: '8px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 'bold', flexShrink: 0 }}
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
                <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap' }}>
                  <select
                    value={selectedVolunteerToAssign}
                    onChange={e => setSelectedVolunteerToAssign(e.target.value ? Number(e.target.value) : '')}
                    style={{ flex: 1, minWidth: 200, padding: isMobile ? '12px 14px' : '8px 12px', border: '1px solid #ced4da', borderRadius: 8, fontSize: 14, minHeight: 44 }}
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
                    style={{ padding: '12px 20px', minHeight: 44, background: '#0d6efd', color: '#fff', border: 'none', borderRadius: 8, cursor: !selectedVolunteerToAssign || assigning ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: !selectedVolunteerToAssign || assigning ? 0.6 : 1, width: isMobile ? '100%' : undefined }}
                  >
                    {assigning ? '...' : '✅ Einplanen'}
                  </button>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '16px 20px', borderTop: '1px solid #e9ecef', background: '#f8f9fa', textAlign: 'right' }}>
              <button onClick={() => setSelectedShift(null)} style={{ padding: '12px 20px', minHeight: 44, minWidth: 100, background: '#6c757d', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}>Schließen</button>
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
