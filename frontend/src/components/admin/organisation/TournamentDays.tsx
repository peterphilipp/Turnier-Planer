import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTournamentWorkAreas, syncTournamentWorkAreas, updateTournamentWorkArea,
  getTournamentDays, createTournamentDay, deleteTournamentDay,
  getDayTemplates, generateShifts, clearShifts, getShifts, getTournaments
} from '../../../api';
import { modal } from '../Modal';
import { btnStyle, inputStyle, minToTime, tdStyle, thStyle, getTemplateDisplayName } from '../shared';
import type { TournamentWorkArea, TournamentDay, GlobalDayTemplate, PlanningShift, Tournament } from '../shared';

/** Datum (Date) -> "YYYY-MM-DD" in UTC, unabhängig von der lokalen Zeitzone. */
const toDateOnly = (d: Date): string => d.toISOString().slice(0, 10);

/** Alle Kalendertage zwischen startDate und endDate eines Turniers (inklusive), als "YYYY-MM-DD". */
function tournamentDateRange(tournament: Tournament | null | undefined): string[] {
  if (!tournament?.startDate || !tournament?.endDate) return [];
  const start = new Date(tournament.startDate);
  const end = new Date(tournament.endDate);
  let cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const dates: string[] = [];
  while (cur <= endUTC) {
    dates.push(toDateOnly(cur));
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
  }
  return dates;
}

const formatDateOption = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00Z').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

export default function TournamentDays({ selectedTournament, adminPrimary = '#198754' }: { selectedTournament: number | null; adminPrimary?: string }) {
  const qc = useQueryClient();
  const tid = selectedTournament;

  const { data: areas = [] } = useQuery<TournamentWorkArea[]>({ queryKey: ['t-work-areas', tid], queryFn: () => getTournamentWorkAreas(tid), enabled: !!tid });
  const { data: days = [] } = useQuery<TournamentDay[]>({ queryKey: ['t-days', tid], queryFn: () => getTournamentDays(tid), enabled: !!tid });
  const { data: templates = [] } = useQuery<GlobalDayTemplate[]>({ queryKey: ['day-templates'], queryFn: getDayTemplates });
  const { data: shifts = [] } = useQuery<PlanningShift[]>({ queryKey: ['shifts', tid], queryFn: () => getShifts(tid), enabled: !!tid });
  // Selbe queryKey/queryFn wie in App.tsx -> nutzt denselben react-query-Cache, kein Doppel-Fetch.
  const { data: tournaments = [] } = useQuery<Tournament[]>({ queryKey: ['tournaments'], queryFn: getTournaments });
  const tournament = tournaments.find(t => t.id === tid) || null;

  // Tabelle zeigt jeden Kalendertag des Turniers (Stammdaten: startDate–endDate) als Zeile;
  // ein Tag existiert serverseitig nur, wenn ihm ein Tag-Typ zugewiesen wurde.
  const availableDates = useMemo(() => tournamentDateRange(tournament), [tournament]);
  const dayByDate = useMemo(() => new Map(days.map(d => [toDateOnly(new Date(d.date)), d] as const)), [days]);

  if (!tid) {
    return <div style={{ background: '#fff', padding: 32, borderRadius: 16, textAlign: 'center', color: '#666' }}>Bitte oben ein Turnier auswählen.</div>;
  }

  // Einheitliche Fehlerbehandlung für alle Mutationen (401 -> klarer Hinweis, kein Uncaught).
  const guard = async (fn: () => Promise<void>) => {
    try { await fn(); }
    catch (e: any) {
      await modal.alert({
        title: e?.status === 401 ? 'Sitzung abgelaufen' : 'Fehler',
        message: e?.status === 401
          ? 'Bitte melde dich neu an – dein Token ist ungültig oder abgelaufen.'
          : (e?.message || 'Aktion fehlgeschlagen')
      });
    }
  };

  const sync = () => guard(async () => {
    const before = areas.length;
    const result = await syncTournamentWorkAreas(tid);
    qc.invalidateQueries({ queryKey: ['t-work-areas', tid] });
    const added = result.length - before;
    await modal.alert({
      title: 'Katalog übernommen',
      message: added > 0
        ? `${added} neue(r) Arbeitsbereich(e) übernommen (${result.length} insgesamt aktiv).`
        : `Bereits alle ${result.length} Arbeitsbereiche übernommen – nichts Neues gefunden.`
    });
  });

  /**
   * Setzt/ändert/entfernt den Tag-Typ für einen Kalendertag. Da eine Vorlage nur beim
   * Anlegen als Snapshot kopiert wird, wird ein bestehender Tag beim Wechsel gelöscht
   * (kaskadiert Slots + darauf erzeugte Shifts) und mit der neuen Vorlage neu angelegt.
   */
  const setDayTemplate = (dateStr: string, existingDay: TournamentDay | undefined, templateId: string) => guard(async () => {
    const affectedShifts = existingDay ? shifts.filter(s => s.tournamentDayId === existingDay.id).length : 0;
    if (existingDay && affectedShifts > 0) {
      const ok = await modal.confirm({
        title: 'Tag-Typ ändern',
        message: `Für diesen Tag existieren bereits ${affectedShifts} Schicht(en) – ggf. mit Helferzuweisungen. Beim Ändern des Tag-Typs werden diese gelöscht. Fortfahren?`,
        variant: 'danger'
      });
      if (!ok) return;
    }

    if (existingDay) {
      await deleteTournamentDay(existingDay.id);
    }
    if (templateId) {
      const tmpl = templates.find(t => String(t.id) === templateId);
      await createTournamentDay({
        tournamentId: tid,
        date: new Date(dateStr).toISOString(),
        label: tmpl?.name || null,
        order: availableDates.indexOf(dateStr),
        templateId: Number(templateId)
      });
    }
    qc.invalidateQueries({ queryKey: ['t-days', tid] });
    qc.invalidateQueries({ queryKey: ['shifts', tid] });
  });

  const doGenerate = () => guard(async () => {
    const res = await generateShifts(tid);
    const orphans: string[] = res.orphanedActiveAreas || [];
    const orphanNote = orphans.length > 0
      ? `\n\n⚠️ Aktiv, aber in keiner Tagesvorlage vorgesehen (keine Schichten erzeugt): ${orphans.join(', ')}. Ordne sie in „Tag-Vorlagen" einem Slot zu oder deaktiviere sie oben unter „Arbeitsbereiche dieses Turniers".`
      : '';
    await modal.alert({ title: 'Fertig', message: `${res.created} neue Schicht(en) erzeugt (${res.existing} bereits vorhanden).${orphanNote}` });
    qc.invalidateQueries({ queryKey: ['shifts', tid] });
  });

  const doClear = () => guard(async () => {
    const volunteerAssignments = shifts.length; // grober Hinweis vor dem Server-Call; exakte Zahl kommt in der Antwort
    if (!(await modal.confirm({
      title: 'Schichten löschen',
      message: `Alle generierten Schichten dieses Turniers löschen (${volunteerAssignments} Stück), um sie neu zu konfigurieren? Bereits vorgenommene Helferzuweisungen gehen dabei verloren.`,
      variant: 'danger'
    }))) return;
    const res = await clearShifts(tid);
    await modal.alert({ title: 'Gelöscht', message: `${res.deletedShifts} Schicht(en) und ${res.deletedVolunteerShifts} Helferzuweisung(en) entfernt.` });
    qc.invalidateQueries({ queryKey: ['shifts', tid] });
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Arbeitsbereiche */}
      <section style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, color: '#212557' }}>🏪 Arbeitsbereiche dieses Turniers</h3>
          <span style={{ flex: 1 }} />
          <button style={{ ...btnStyle, background: adminPrimary, color: '#fff', minHeight: 38 }} onClick={sync}>Aus Katalog übernehmen</button>
        </div>
        {areas.length === 0 && <p style={{ color: '#888' }}>Noch keine Bereiche übernommen. Klicke „Aus Katalog übernehmen".</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
          {areas.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '6px 0', borderBottom: '1px solid #f1f3f5', opacity: a.active ? 1 : 0.5 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 200 }}>
                <input type="checkbox" checked={a.active} onChange={e => guard(async () => { await updateTournamentWorkArea(a.id, { active: e.target.checked }); qc.invalidateQueries({ queryKey: ['t-work-areas', tid] }); })} />
                <span style={{ fontWeight: 600 }}>{a.icon} {a.name}</span>
              </label>
              <span style={{ fontSize: 13, color: '#666' }}>Helfer:</span>
              <input type="number" min={0} defaultValue={a.minVolunteers} style={{ ...inputStyle, width: 64 }}
                onBlur={e => guard(async () => { await updateTournamentWorkArea(a.id, { minVolunteers: parseInt(e.target.value) || 0 }); })} />
              <span>–</span>
              <input type="number" min={0} defaultValue={a.maxVolunteers} style={{ ...inputStyle, width: 64 }}
                onBlur={e => guard(async () => { await updateTournamentWorkArea(a.id, { maxVolunteers: parseInt(e.target.value) || 0 }); })} />
              {(a.operatingStartMin != null || a.operatingEndMin != null) && (
                <span style={{ fontSize: 12, color: '#999' }}>
                  Betrieb: {a.operatingStartMin != null ? minToTime(a.operatingStartMin) : '–'}…{a.operatingEndMin != null ? minToTime(a.operatingEndMin) : '–'}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Tage */}
      <section style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <h3 style={{ margin: '0 0 4px 0', color: '#212557' }}>📅 Turnier-Tage</h3>
        <p style={{ color: '#666', fontSize: 13, marginTop: 0 }}>
          {tournament && availableDates.length > 0
            ? <>Alle Kalendertage des Turniers (Stammdaten: <strong>{formatDateOption(availableDates[0])} – {formatDateOption(availableDates[availableDates.length - 1])}</strong>). Wähle je Tag einen Tag-Typ – die Zeit-Slots werden daraus übernommen.</>
            : 'Turnier wird geladen…'}
        </p>

        {availableDates.length === 0 ? (
          <p style={{ color: '#888' }}>Turnier hat keinen gültigen Zeitraum (Stammdaten prüfen).</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr>
                <th style={thStyle}>Turniertag</th>
                <th style={thStyle}>Tag-Typ</th>
                <th style={thStyle}>Zeit-Slots</th>
              </tr>
            </thead>
            <tbody>
              {availableDates.map(dateStr => {
                const day = dayByDate.get(dateStr);
                return (
                  <tr key={dateStr}>
                    <td style={tdStyle}>{formatDateOption(dateStr)}</td>
                    <td style={tdStyle}>
                      <select style={inputStyle} value={day?.sourceTemplateId ? String(day.sourceTemplateId) : ''}
                        onChange={e => setDayTemplate(dateStr, day, e.target.value)}>
                        <option value="">-- kein Tag-Typ --</option>
                        {templates.filter(t => !t.isObsolete).map(t => <option key={t.id} value={t.id}>{getTemplateDisplayName(t)}</option>)}
                      </select>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 13, color: '#666' }}>
                      {(day?.slots || []).map(s => `${minToTime(s.startMin)}–${minToTime(s.endMin)}`).join(', ') || '–'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Generierung + Zeitleiste */}
      <section style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#212557' }}>🧩 Schichtplan</h3>
          <span style={{ flex: 1 }} />
          {shifts.length > 0 && (
            <button style={{ ...btnStyle, background: '#f8d7da', color: '#842029' }} onClick={doClear}>Schichten löschen</button>
          )}
          <button style={{ ...btnStyle, background: '#0d6efd', color: '#fff' }} onClick={doGenerate}>Schichten generieren</button>
        </div>
        {shifts.length === 0 && <p style={{ color: '#888' }}>Noch keine Schichten. Lege Tage + Bereiche an und klicke „Schichten generieren".</p>}
        {(() => {
          let globalStartMin = 1440;
          let globalEndMin = 0;
          for (const d of days) {
            if (d.slots && d.slots.length > 0) {
              globalStartMin = Math.min(globalStartMin, ...d.slots.map(s => s.startMin));
              globalEndMin = Math.max(globalEndMin, ...d.slots.map(s => s.endMin));
            }
          }
          if (globalStartMin > globalEndMin) {
            globalStartMin = 480;
            globalEndMin = 1080;
          }
          return [...days].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(d => 
            <DayTimeline key={d.id} day={d} shifts={shifts.filter(s => s.tournamentDayId === d.id)} globalStartMin={globalStartMin} globalEndMin={globalEndMin} />
          );
        })()}
      </section>
    </div>
  );
}

// ---- Visuelle Zeitleiste pro Tag (Balkenbreite proportional zur Slot-Dauer) ----
function DayTimeline({ day, shifts, globalStartMin, globalEndMin }: { day: TournamentDay; shifts: PlanningShift[]; globalStartMin: number; globalEndMin: number; }) {
  const slots = day.slots || [];
  if (slots.length === 0 || shifts.length === 0) return null;
  
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
  const byArea = new Map<number, { name: string; icon: string; color: string; items: PlanningShift[] }>();
  for (const s of shifts) {
    const key = s.tournamentWorkAreaId;
    if (!byArea.has(key)) byArea.set(key, { name: s.workArea?.name || '?', icon: s.workArea?.icon || '📍', color: s.workArea?.color || '#3b98f8', items: [] });
    byArea.get(key)!.items.push(s);
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontWeight: 600, marginBottom: 12 }}>
        {new Date(day.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })} {day.label ? `· ${day.label}` : ''}
      </div>
      
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
                      const st = s.startMin ?? s.daySlot?.startMin ?? dayStart;
                      const en = s.endMin ?? s.daySlot?.endMin ?? dayEnd;
                      const left = ((st - dayStart) / span) * 100;
                      const width = ((en - st) / span) * 100;
                      const showTime = width > 15;
                      
                      return (
                        <div key={s.id} title={`${minToTime(st)}–${minToTime(en)} · ${s.minVolunteers}–${s.maxVolunteers} Helfer`}
                          style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, top: 2, bottom: 2, background: area.color, borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', whiteSpace: 'nowrap', padding: '0 4px', boxSizing: 'border-box' }}>
                          <span style={{ fontWeight: 600, opacity: 0.9 }}>
                            {showTime ? `${minToTime(st)}–${minToTime(en)} (${s.minVolunteers}-${s.maxVolunteers})` : `${s.minVolunteers}-${s.maxVolunteers}`}
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
