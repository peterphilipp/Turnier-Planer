import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTournamentWorkAreas, syncTournamentWorkAreas, updateTournamentWorkArea,
  getTournamentDays, createTournamentDay, deleteTournamentDay,
  getDayTemplates, generateShifts, getShifts, getTournaments
} from '../../../api';
import { modal } from '../Modal';
import { btnStyle, inputStyle, minToTime } from '../shared';
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

  // Auswahl beschränkt sich auf die tatsächlichen Turniertage (Stammdaten: startDate–endDate),
  // bereits angelegte Tage werden als belegt markiert statt doppelt anlegbar zu sein.
  const availableDates = useMemo(() => tournamentDateRange(tournament), [tournament]);
  const usedDates = useMemo(() => new Set(days.map(d => toDateOnly(new Date(d.date)))), [days]);

  const [dayDraft, setDayDraft] = useState<{ date: string; label: string; templateId: string }>({ date: '', label: '', templateId: '' });
  // Verhindert, dass ein manuell angepasstes Label beim Vorlagenwechsel überschrieben wird.
  const [labelTouched, setLabelTouched] = useState(false);

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['t-work-areas', tid] });
    qc.invalidateQueries({ queryKey: ['t-days', tid] });
    qc.invalidateQueries({ queryKey: ['shifts', tid] });
  };

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

  const addDay = () => guard(async () => {
    if (!dayDraft.date) { await modal.alert({ title: 'Hinweis', message: 'Bitte ein Datum wählen.' }); return; }
    await createTournamentDay({
      tournamentId: tid,
      date: new Date(dayDraft.date).toISOString(),
      label: dayDraft.label || null,
      order: days.length,
      templateId: dayDraft.templateId ? Number(dayDraft.templateId) : null
    });
    setDayDraft({ date: '', label: '', templateId: '' });
    setLabelTouched(false);
    qc.invalidateQueries({ queryKey: ['t-days', tid] });
  });

  const onTemplateChange = (templateId: string) => {
    const tmpl = templates.find(t => String(t.id) === templateId);
    // Bezeichnung automatisch aus der Vorlage übernehmen (z. B. "Aufbautag"),
    // aber nicht überschreiben, wenn der Nutzer sie bereits manuell angepasst hat.
    setDayDraft(d => ({ ...d, templateId, label: (!labelTouched && tmpl) ? tmpl.name : d.label }));
  };

  const removeDay = (d: TournamentDay) => guard(async () => {
    if (!(await modal.confirm({ title: 'Tag löschen', message: 'Tag inkl. Slots und daraus erzeugter Shifts löschen?', variant: 'danger' }))) return;
    await deleteTournamentDay(d.id);
    refreshAll();
  });

  const doGenerate = () => guard(async () => {
    const res = await generateShifts(tid);
    await modal.alert({ title: 'Fertig', message: `${res.created} neue Schicht(en) erzeugt (${res.existing} bereits vorhanden).` });
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
            ? <>Turnierzeitraum lt. Stammdaten: <strong>{formatDateOption(availableDates[0])} – {formatDateOption(availableDates[availableDates.length - 1])}</strong>. Wähle einen dieser Tage und optional eine Vorlage – die Bezeichnung wird daraus übernommen.</>
            : 'Turnier wird geladen…'}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <select style={inputStyle} value={dayDraft.date} onChange={e => setDayDraft(d => ({ ...d, date: e.target.value }))}>
            <option value="">-- Turniertag wählen --</option>
            {availableDates.map(dateStr => {
              const used = usedDates.has(dateStr);
              return (
                <option key={dateStr} value={dateStr} disabled={used}>
                  {formatDateOption(dateStr)}{used ? ' (bereits angelegt)' : ''}
                </option>
              );
            })}
          </select>
          <select style={inputStyle} value={dayDraft.templateId} onChange={e => onTemplateChange(e.target.value)}>
            <option value="">-- ohne Vorlage --</option>
            {templates.filter(t => !t.isObsolete).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input style={{ ...inputStyle, width: 160 }} placeholder="Bezeichnung (aus Vorlage übernommen)" value={dayDraft.label}
            onChange={e => { setLabelTouched(true); setDayDraft(d => ({ ...d, label: e.target.value })); }} />
          <button style={{ ...btnStyle, background: adminPrimary, color: '#fff' }} onClick={addDay}>+ Tag</button>
        </div>

        {days.map(d => (
          <div key={d.id} style={{ border: '1px solid #e9ecef', borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <strong>{new Date(d.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}</strong>
              {d.label && <span style={{ background: '#e9ecef', borderRadius: 6, padding: '2px 8px', fontSize: 12 }}>{d.label}</span>}
              <span style={{ fontSize: 13, color: '#666' }}>{(d.slots || []).map(s => `${minToTime(s.startMin)}–${minToTime(s.endMin)}`).join(', ') || 'keine Slots'}</span>
              <span style={{ flex: 1 }} />
              <button style={{ ...btnStyle, background: '#f8d7da', color: '#842029', minHeight: 32, padding: '4px 10px' }} onClick={() => removeDay(d)}>Löschen</button>
            </div>
          </div>
        ))}
        {days.length === 0 && <p style={{ color: '#888' }}>Noch keine Tage angelegt.</p>}
      </section>

      {/* Generierung + Zeitleiste */}
      <section style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#212557' }}>🧩 Schichtplan</h3>
          <span style={{ flex: 1 }} />
          <button style={{ ...btnStyle, background: '#0d6efd', color: '#fff' }} onClick={doGenerate}>Shifts generieren</button>
        </div>
        {shifts.length === 0 && <p style={{ color: '#888' }}>Noch keine Shifts. Lege Tage + Bereiche an und klicke „Shifts generieren".</p>}
        {days.map(d => <DayTimeline key={d.id} day={d} shifts={shifts.filter(s => s.tournamentDayId === d.id)} />)}
      </section>
    </div>
  );
}

// ---- Visuelle Zeitleiste pro Tag (Balkenbreite proportional zur Slot-Dauer) ----
function DayTimeline({ day, shifts }: { day: TournamentDay; shifts: PlanningShift[] }) {
  const slots = day.slots || [];
  if (slots.length === 0 || shifts.length === 0) return null;
  const dayStart = Math.min(...slots.map(s => s.startMin));
  const dayEnd = Math.max(...slots.map(s => s.endMin));
  const span = Math.max(1, dayEnd - dayStart);

  // nach Area gruppieren
  const byArea = new Map<number, { name: string; icon: string; color: string; items: PlanningShift[] }>();
  for (const s of shifts) {
    const key = s.tournamentWorkAreaId;
    if (!byArea.has(key)) byArea.set(key, { name: s.workArea?.name || '?', icon: s.workArea?.icon || '📍', color: s.workArea?.color || '#3b98f8', items: [] });
    byArea.get(key)!.items.push(s);
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        {new Date(day.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })} {day.label ? `· ${day.label}` : ''}
        <span style={{ color: '#999', fontWeight: 400, fontSize: 12 }}> ({minToTime(dayStart)}–{minToTime(dayEnd)})</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[...byArea.values()].map((area, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 150, flexShrink: 0, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{area.icon} {area.name}</div>
            <div style={{ position: 'relative', flex: 1, height: 26, background: '#f1f3f5', borderRadius: 6 }}>
              {area.items.map(s => {
                const st = s.daySlot?.startMin ?? dayStart;
                const en = s.daySlot?.endMin ?? dayEnd;
                const left = ((st - dayStart) / span) * 100;
                const width = ((en - st) / span) * 100;
                return (
                  <div key={s.id} title={`${minToTime(st)}–${minToTime(en)} · ${s.minVolunteers}–${s.maxVolunteers} Helfer`}
                    style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, top: 3, bottom: 3, background: area.color, borderRadius: 4, color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {s.minVolunteers}–{s.maxVolunteers}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
