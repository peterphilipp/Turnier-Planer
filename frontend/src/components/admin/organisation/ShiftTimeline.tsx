import { useState, useRef, useEffect, ReactNode } from 'react';
import { minToTime } from '../shared';
import type { VolunteerShift } from '../shared';

/**
 * Gemeinsame Zeitleiste für Schichten (Gantt-Darstellung).
 *
 * Ersetzt die zuvor doppelt gepflegten Varianten `DayTimeline` (Schichten
 * erstellen) und `OverviewTimeline` (Dienstplan), die zu ~90 % identisch waren.
 *
 * Zwei Modi:
 *  - editable=false  -> reine Vorschau. Verwendet im Generator ("Schichten
 *                       erstellen") zur Kontrolle des erzeugten Plans.
 *  - editable=true   -> Balken lassen sich verschieben und an den Rändern
 *                       greifen (Zeiten ändern). Verwendet im "Dienstplan".
 *
 * Balken-Beschriftung richtet sich danach, ob Besetzungsdaten übergeben werden:
 *  - mit volunteerShifts -> "x/max" plus Ampel-Rahmen (grün voll / gelb teils)
 *  - ohne                -> "min–max" (geplante Kapazität)
 */
export interface TimelineShift {
  id: number;
  tournamentWorkAreaId?: number | null;
  arbeitsbereichId?: number | null;
  startMin?: number | null;
  endMin?: number | null;
  minVolunteers?: number;
  maxVolunteers?: number;
  daySlot?: { startMin: number; endMin: number } | null;
  workArea?: { name: string; icon: string; color: string } | null;
  arbeitsbereich?: { name: string; icon: string; color: string } | null;
}

const GRID_MINUTES = 15;

export default function ShiftTimeline({
  title,
  subtitle,
  headerRight,
  shifts,
  globalStartMin,
  globalEndMin,
  volunteerShifts,
  editable = false,
  onShiftClick,
  onUpdateShiftTime
}: {
  title: string;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  shifts: TimelineShift[];
  globalStartMin: number;
  globalEndMin: number;
  /** Wenn gesetzt, zeigen die Balken die Besetzung statt der Kapazität. */
  volunteerShifts?: VolunteerShift[];
  editable?: boolean;
  onShiftClick?: (s: TimelineShift) => void;
  onUpdateShiftTime?: (shiftId: number, startMin: number, endMin: number) => void;
}) {
  const startHour = Math.floor(globalStartMin / 60);
  const endHour = Math.ceil(globalEndMin / 60);
  const dayStart = startHour * 60;
  const dayEnd = endHour * 60;
  const span = Math.max(1, dayEnd - dayStart);

  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);

  const [drag, setDrag] = useState<{
    shiftId: number;
    type: 'start' | 'end' | 'move';
    origStart: number;
    origEnd: number;
    curStart: number;
    curEnd: number;
    startX: number;
    containerWidth: number;
    moved: boolean;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const shiftStart = (s: TimelineShift) => s.startMin ?? s.daySlot?.startMin ?? dayStart;
  const shiftEnd = (s: TimelineShift) => s.endMin ?? s.daySlot?.endMin ?? dayEnd;

  const handleMouseDown = (e: React.MouseEvent, s: TimelineShift, type: 'start' | 'end' | 'move') => {
    if (!editable) return;
    e.stopPropagation();
    e.preventDefault();
    setDrag({
      shiftId: s.id,
      type,
      origStart: shiftStart(s),
      origEnd: shiftEnd(s),
      curStart: shiftStart(s),
      curEnd: shiftEnd(s),
      startX: e.clientX,
      containerWidth: containerRef.current?.getBoundingClientRect().width || 600,
      moved: false
    });
  };

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: MouseEvent) => {
      const deltaMin = Math.round(((e.clientX - drag.startX) / drag.containerWidth) * span);
      const gridDelta = Math.round(deltaMin / GRID_MINUTES) * GRID_MINUTES;

      let nextStart = drag.origStart;
      let nextEnd = drag.origEnd;

      if (drag.type === 'start') {
        nextStart = Math.max(dayStart, Math.min(drag.origEnd - GRID_MINUTES, drag.origStart + gridDelta));
      } else if (drag.type === 'end') {
        nextEnd = Math.min(dayEnd, Math.max(drag.origStart + GRID_MINUTES, drag.origEnd + gridDelta));
      } else {
        const duration = drag.origEnd - drag.origStart;
        nextStart = Math.max(dayStart, Math.min(dayEnd - duration, drag.origStart + gridDelta));
        nextEnd = nextStart + duration;
      }

      setDrag(prev => prev ? { ...prev, curStart: nextStart, curEnd: nextEnd, moved: true } : null);
    };

    const onUp = () => {
      const changed = drag.curStart !== drag.origStart || drag.curEnd !== drag.origEnd;
      if (changed) {
        onUpdateShiftTime?.(drag.shiftId, drag.curStart, drag.curEnd);
      } else if (drag.type === 'move' && !drag.moved) {
        // Klick ohne Ziehen = Detailansicht öffnen (Helfer ein-/ausplanen)
        const s = shifts.find(x => x.id === drag.shiftId);
        if (s) onShiftClick?.(s);
      }
      setDrag(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, dayStart, dayEnd, span, onUpdateShiftTime, onShiftClick, shifts]);

  // Nach Arbeitsbereich gruppieren (eine Zeile je Bereich)
  const byArea = new Map<number, { name: string; icon: string; color: string; items: TimelineShift[] }>();
  for (const s of shifts) {
    const key = (s.tournamentWorkAreaId ?? s.arbeitsbereichId ?? 0) as number;
    if (!byArea.has(key)) {
      byArea.set(key, {
        name: s.workArea?.name || s.arbeitsbereich?.name || '?',
        icon: s.workArea?.icon || s.arbeitsbereich?.icon || '📍',
        color: s.workArea?.color || s.arbeitsbereich?.color || '#3b98f8',
        items: []
      });
    }
    byArea.get(key)!.items.push(s);
  }

  if (shifts.length === 0) return null;
  const areas = [...byArea.values()];

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: '#212557' }}>{title}</span>
        {subtitle}
        <span style={{ flex: 1 }} />
        {headerRight}
      </div>

      <div style={{ paddingBottom: 8 }}>
        <div style={{ position: 'relative', paddingRight: 20 }}>
          {/* Stunden-Header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: 160, height: 24, borderBottom: '1px solid #ccc', position: 'relative' }}>
            {hours.map(h => (
              <div key={h} style={{ position: 'absolute', left: `${((h * 60 - dayStart) / span) * 100}%`, transform: 'translateX(-50%)', fontSize: 11, color: '#666', bottom: 4 }}>
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          <div style={{ position: 'relative', marginLeft: 160 }} ref={containerRef}>
            {/* Vertikale Rasterlinien */}
            <div style={{ position: 'absolute', top: 0, bottom: '100%', minHeight: areas.length * 38 + 16, left: 0, right: 0, pointerEvents: 'none' }}>
              {hours.map(h => (
                <div key={h} style={{ position: 'absolute', left: `${((h * 60 - dayStart) / span) * 100}%`, top: 0, bottom: 0, width: 1, background: '#e9ecef' }} />
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {areas.map((area, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', height: 32, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -160, width: 150, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {area.icon} {area.name}
                  </div>

                  <div style={{ position: 'relative', width: '100%', height: '100%', background: 'rgba(241, 243, 245, 0.4)', borderRadius: 6 }}>
                    {area.items.map(s => {
                      const isDragging = drag?.shiftId === s.id;
                      const st = isDragging ? drag!.curStart : shiftStart(s);
                      const en = isDragging ? drag!.curEnd : shiftEnd(s);
                      const left = ((st - dayStart) / span) * 100;
                      const width = ((en - st) / span) * 100;
                      const showTime = width > 15;
                      const hasCustomTime = s.startMin != null || s.endMin != null;

                      // Besetzung nur anzeigen, wenn Zuweisungen übergeben wurden
                      const assigned = volunteerShifts
                        ? volunteerShifts.filter(vs => vs.shiftId === s.id).length
                        : null;
                      const max = s.maxVolunteers ?? 1;
                      const isFull = assigned != null && assigned >= max;
                      const staffingBorder = assigned == null
                        ? undefined
                        : isFull ? '#198754' : assigned > 0 ? '#ffc107' : undefined;

                      const label = assigned != null
                        ? (showTime ? `${minToTime(st)}–${minToTime(en)} (${assigned}/${max}${isFull ? ' ✓' : ''})` : `${assigned}/${max}${isFull ? ' ✓' : ''}`)
                        : (showTime ? `${minToTime(st)}–${minToTime(en)} (${s.minVolunteers}-${max})` : `${s.minVolunteers}-${max}`);

                      const tooltip = assigned != null
                        ? `${minToTime(st)}–${minToTime(en)} · ${assigned}/${max} Helfer${editable ? ' · klicken für Details, Ränder ziehen für Zeiten' : ''}`
                        : `${minToTime(st)}–${minToTime(en)} · ${s.minVolunteers}–${max} Helfer${hasCustomTime ? ' (angepasste Zeit)' : ''}`;

                      const interactive = editable || !!onShiftClick;

                      return (
                        <div
                          key={s.id}
                          title={tooltip}
                          onMouseDown={editable ? e => handleMouseDown(e, s, 'move') : undefined}
                          onClick={!editable && onShiftClick ? () => onShiftClick(s) : undefined}
                          style={{
                            position: 'absolute', left: `${left}%`, width: `${width}%`, top: 2, bottom: 2,
                            background: area.color, borderRadius: 6,
                            boxShadow: isDragging
                              ? '0 4px 12px rgba(0,0,0,0.4)'
                              : staffingBorder ? `0 0 0 2px ${staffingBorder}` : '0 1px 3px rgba(0,0,0,0.2)',
                            border: hasCustomTime ? '2px dashed rgba(255,255,255,0.9)' : 'none',
                            color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden', whiteSpace: 'nowrap', padding: '0 8px', boxSizing: 'border-box',
                            cursor: isDragging ? 'grabbing' : editable ? 'grab' : interactive ? 'pointer' : 'default',
                            opacity: isDragging ? 0.9 : 1,
                            zIndex: isDragging ? 50 : 1,
                            transition: isDragging ? 'none' : 'left 0.15s, width 0.15s'
                          }}
                        >
                          {editable && (
                            <div
                              onMouseDown={e => handleMouseDown(e, s, 'start')}
                              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', background: 'rgba(0,0,0,0.1)' }}
                              title="Startzeit verschieben"
                            />
                          )}

                          <span style={{ fontWeight: 600, opacity: 0.92, pointerEvents: 'none' }}>{label}</span>

                          {editable && (
                            <div
                              onMouseDown={e => handleMouseDown(e, s, 'end')}
                              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize', background: 'rgba(0,0,0,0.1)' }}
                              title="Endzeit verschieben"
                            />
                          )}
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
