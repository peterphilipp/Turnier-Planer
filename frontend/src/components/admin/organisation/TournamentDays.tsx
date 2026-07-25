import { useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getTournamentWorkAreas, syncTournamentWorkAreas, updateTournamentWorkArea,
  getTournamentDays, createTournamentDay, deleteTournamentDay,
  getDayTemplates, generateShifts, clearShifts, getShifts, getTournaments,
  exportDayToTemplate
} from '../../../api';
import { modal } from '../Modal';
import { btnStyle, inputStyle, minToTime, tdStyle, thStyle, getTemplateDisplayName } from '../shared';
import type { TournamentWorkArea, TournamentDay, GlobalDayTemplate, PlanningShift, Tournament } from '../shared';
import ShiftFeedbackModal from './ShiftFeedbackModal';
import ShiftTimeline from './ShiftTimeline';

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

export default function TournamentDays({ selectedTournament, adminPrimary = '#198754', onGoToDienstplan }: { selectedTournament: number | null; adminPrimary?: string; onGoToDienstplan?: () => void }) {
  const qc = useQueryClient();
  const tid = selectedTournament;
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

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



  const doExportTemplate = useCallback(async (day: TournamentDay) => {
    const dayShifts = shifts.filter(s => s.tournamentDayId === day.id);
    if (dayShifts.length === 0) {
      await modal.alert({ title: 'Hinweis', message: 'Für diesen Tag existieren keine Schichten, die als Vorlage exportiert werden könnten.' });
      return;
    }

    const res = await modal.form({
      title: '✨ Als neue Tagesvorlage speichern',
      fields: [
        { key: 'name', label: 'Name der neuen Vorlage', type: 'text', placeholder: 'z.B. Samstag - Optimierter Zeitplan', defaultValue: `${day.label || 'Turniertag'} - Optimiert` },
        { key: 'description', label: 'Beschreibung / Notiz (optional)', type: 'text', placeholder: 'z.B. Angepasste Aufbauzeiten aus dem Sommerturnier' }
      ]
    });

    if (!res || !res.name || !String(res.name).trim()) return;

    guard(async () => {
      const created = await exportDayToTemplate(day.id, {
        name: String(res.name).trim(),
        description: res.description ? String(res.description).trim() : undefined
      });
      qc.invalidateQueries({ queryKey: ['day-templates'] });
      await modal.alert({
        title: 'Vorlage gespeichert 🚀',
        message: `Die Vorlage „${created.name}“ wurde erfolgreich im Katalog unter Stammdaten angelegt und kann ab sofort für zukünftige Turniere verwendet werden!`
      });
    });
  }, [shifts, qc]);

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

      {/* Generierung + read-only Kontrollvorschau */}
      <section style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
          <h3 style={{ margin: 0, color: '#212557' }}>🧩 Schichten erzeugen</h3>
          <span style={{ flex: 1 }} />
          <button style={{ ...btnStyle, background: '#ffc107', color: '#000', fontWeight: 'bold' }} onClick={() => setShowFeedbackModal(true)}>📊 Helfer-Feedback & Learnings</button>
          {shifts.length > 0 && (
            <button style={{ ...btnStyle, background: '#f8d7da', color: '#842029' }} onClick={doClear}>Schichten löschen</button>
          )}
          <button style={{ ...btnStyle, background: '#0d6efd', color: '#fff' }} onClick={doGenerate}>Schichten generieren</button>
        </div>
        <p style={{ color: '#666', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
          Vorschau zur Kontrolle – hier wird nur <strong>erzeugt</strong>. Zeiten anpassen und Helfer
          einplanen geschieht im <strong>Dienstplan</strong>.
        </p>

        {shifts.length === 0 && <p style={{ color: '#888' }}>Noch keine Schichten. Lege Tage + Bereiche an und klicke „Schichten generieren".</p>}

        {shifts.length > 0 && onGoToDienstplan && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: '#e7f1ff', border: '1px solid #b6d4fe', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <span style={{ fontSize: 14, color: '#084298' }}>
              {shifts.length} Schicht(en) erzeugt. Feinschliff der Zeiten und die Besetzung machst du im Dienstplan.
            </span>
            <span style={{ flex: 1 }} />
            <button style={{ ...btnStyle, background: '#0d6efd', color: '#fff', minHeight: 38 }} onClick={onGoToDienstplan}>
              Zum Dienstplan →
            </button>
          </div>
        )}

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
          return [...days].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(d => (
            <ShiftTimeline
              key={d.id}
              title={`${new Date(d.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })}${d.label ? ` · ${d.label}` : ''}`}
              shifts={shifts.filter(s => s.tournamentDayId === d.id)}
              globalStartMin={globalStartMin}
              globalEndMin={globalEndMin}
              editable={false}
              headerRight={
                <button
                  style={{ ...btnStyle, background: '#e2e3e5', color: '#383d41', padding: '4px 12px', fontSize: 12, minHeight: 28 }}
                  onClick={() => doExportTemplate(d)}
                  title="Schichten dieses Tages als neue Tagesvorlage in den Katalog exportieren"
                >
                  ✨ Als neue Vorlage exportieren
                </button>
              }
            />
          ));
        })()}
      </section>

      {showFeedbackModal && tournament && (
        <ShiftFeedbackModal 
          tournament={tournament}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
    </div>
  );
}
