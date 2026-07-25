import { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shift, VolunteerShift, TournamentWorkArea, TournamentDay, GlobalDayTemplate, Tournament, minToTime } from '../shared';
import {
  getShifts, getVolunteerShifts, getVolunteers, apiPost, apiDelete, updateShiftsBatch,
  getTournamentWorkAreas, syncTournamentWorkAreas, updateTournamentWorkArea,
  getTournamentDays, createTournamentDay, deleteTournamentDay,
  getDayTemplates, generateShifts, clearShifts, exportDayToTemplate, getTournaments
} from '../../../api';
import { modal } from '../Modal';
import { btnStyle, inputStyle, tdStyle, thStyle, getTemplateDisplayName } from '../shared';
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

  // Turnier-Einrichtung (Arbeitsbereiche/Tage/Generieren): Standardmäßig
  // eingeklappt, sobald schon Schichten existieren (dann ist es Alltag,
  // keine Ersteinrichtung mehr) - aber jederzeit manuell auf-/zuklappbar.
  // null = kein manueller Override, folgt dem Datenstand.
  const [setupExpandedOverride, setSetupExpandedOverride] = useState<boolean | null>(null);

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

  const tid = selectedTournament;

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

  // Turnier-Einrichtung: dieselben Queries/Query-Keys wie zuvor in
  // TournamentDays.tsx, damit derselbe react-query-Cache genutzt wird.
  const { data: areas = [] } = useQuery<TournamentWorkArea[]>({ queryKey: ['t-work-areas', tid], queryFn: () => getTournamentWorkAreas(tid), enabled: !!tid });
  const { data: days = [] } = useQuery<TournamentDay[]>({ queryKey: ['t-days', tid], queryFn: () => getTournamentDays(tid), enabled: !!tid });
  const { data: templates = [] } = useQuery<GlobalDayTemplate[]>({ queryKey: ['day-templates'], queryFn: getDayTemplates });
  const { data: tournaments = [] } = useQuery<Tournament[]>({ queryKey: ['tournaments'], queryFn: getTournaments });
  const tournament = tournaments.find(t => t.id === tid) || null;
  const availableDates = useMemo(() => tournamentDateRange(tournament), [tournament]);
  const dayByDate = useMemo(() => new Map(days.map(d => [toDateOnly(new Date(d.date)), d] as const)), [days]);

  const setupExpanded = setupExpandedOverride ?? (jobSlots.length === 0);

  /** Einheitliche Fehlerbehandlung für Setup-Mutationen (401 -> klarer Hinweis, kein Uncaught). */
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
    if (!tid) return;
    const before = areas.length;
    const result = await syncTournamentWorkAreas(tid);
    queryClient.invalidateQueries({ queryKey: ['t-work-areas', tid] });
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
    if (!tid) return;
    const affectedShifts = existingDay ? jobSlots.filter(s => (s as any).tournamentDayId === existingDay.id).length : 0;
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
    queryClient.invalidateQueries({ queryKey: ['t-days', tid] });
    queryClient.invalidateQueries({ queryKey: ['shifts', tid] });
  });

  const doGenerate = () => guard(async () => {
    if (!tid) return;
    const res = await generateShifts(tid);
    const orphans: string[] = res.orphanedActiveAreas || [];
    const orphanNote = orphans.length > 0
      ? `\n\n⚠️ Aktiv, aber in keiner Tagesvorlage vorgesehen (keine Schichten erzeugt): ${orphans.join(', ')}. Ordne sie in „Tag-Vorlagen" einem Slot zu oder deaktiviere sie oben unter „Arbeitsbereiche dieses Turniers".`
      : '';
    await modal.alert({ title: 'Fertig', message: `${res.created} neue Schicht(en) erzeugt (${res.existing} bereits vorhanden).${orphanNote}` });
    queryClient.invalidateQueries({ queryKey: ['shifts', tid] });
  });

  const doClear = () => guard(async () => {
    if (!tid) return;
    const volunteerAssignments = jobSlots.length; // grober Hinweis vor dem Server-Call; exakte Zahl kommt in der Antwort
    if (!(await modal.confirm({
      title: 'Schichten löschen',
      message: `Alle generierten Schichten dieses Turniers löschen (${volunteerAssignments} Stück), um sie neu zu konfigurieren? Bereits vorgenommene Helferzuweisungen gehen dabei verloren.`,
      variant: 'danger'
    }))) return;
    const res = await clearShifts(tid);
    await modal.alert({ title: 'Gelöscht', message: `${res.deletedShifts} Schicht(en) und ${res.deletedVolunteerShifts} Helferzuweisung(en) entfernt.` });
    queryClient.invalidateQueries({ queryKey: ['shifts', tid] });
  });

  const doExportTemplate = useCallback(async (day: TournamentDay) => {
    const dayShifts = jobSlots.filter(s => (s as any).tournamentDayId === day.id);
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
      queryClient.invalidateQueries({ queryKey: ['day-templates'] });
      await modal.alert({
        title: 'Vorlage gespeichert 🚀',
        message: `Die Vorlage „${created.name}“ wurde erfolgreich im Katalog unter Stammdaten angelegt und kann ab sofort für zukünftige Turniere verwendet werden!`
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobSlots, queryClient]);

  /**
   * "+ Arbeitsbereich hinzufügen" pro Tag: zeigt nur aktive Arbeitsbereiche,
   * die an DIESEM Tag noch keine Schicht haben, zur Auswahl an. Nutzt dieselbe
   * sichere, additive generateShifts()-Logik wie der große "Schichten
   * generieren"-Knopf (turnierweit, rührt Bestehendes nie an) - kein eigener
   * Endpoint nötig. Ist der gewählte Arbeitsbereich keinem Zeit-Slot des
   * Tag-Typs zugeordnet, erzeugt generateShifts() dafür schlicht nichts; das
   * wird in der Rückmeldung transparent gemacht statt stillschweigend zu tun.
   */
  const addWorkAreaToDay = (day: TournamentDay) => guard(async () => {
    if (!tid) return;
    const dayAreaIds = new Set(jobSlots.filter(s => (s as any).tournamentDayId === day.id).map(s => (s as any).tournamentWorkAreaId));
    const candidates = areas.filter(a => a.active && !dayAreaIds.has(a.id));
    if (candidates.length === 0) {
      await modal.alert({ title: 'Hinweis', message: 'Alle aktiven Arbeitsbereiche dieses Turniers sind an diesem Tag bereits eingeplant.' });
      return;
    }
    const res = await modal.form({
      title: '➕ Arbeitsbereich zu diesem Tag hinzufügen',
      fields: [{ key: 'areaId', label: 'Arbeitsbereich', type: 'select', options: candidates.map(a => ({ value: a.id, label: `${a.icon} ${a.name}` })) }]
    });
    if (!res || !res.areaId) return;
    const chosen = candidates.find(a => String(a.id) === String(res.areaId));
    const genRes = await generateShifts(tid);
    queryClient.invalidateQueries({ queryKey: ['shifts', tid] });
    await modal.alert({
      title: 'Erledigt',
      message: `${genRes.created} neue Schicht(en) erzeugt (${genRes.existing} bereits vorhanden). Falls „${chosen?.name}" hier nicht auftaucht, ist er keinem Zeit-Slot des Tag-Typs dieses Tages zugeordnet – das lässt sich unter Stammdaten → Tagesvorlagen anpassen.`
    });
  });

  /**
   * Zeiten einer Schicht anpassen. Zeit-Änderungen laufen über einen expliziten
   * Editiermodus statt sofort bei jedem Ziehen zu speichern: mehrere
   * Anpassungen (z. B. eine Schicht verkürzen, weil eine andere verlängert
   * wird) werden gesammelt und erst per Commit als eine Transaktion
   * übernommen. Das vermeidet einen Zwischenzustand, der später unnötige/
   * widersprüchliche Benachrichtigungen an eingeplante Helfer auslösen würde.
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

  if (busySlots || busyVolShifts) {
    return <div style={{ textAlign: 'center', padding: 20 }}>⏳ Lade Daten...</div>;
  }

  const grouped: Record<string, any[]> = {};
  [...jobSlots].sort((a: any, b: any) => {
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

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      {/* Turnier-Einrichtung: Arbeitsbereiche/Tage/Generieren - eingeklappt,
          sobald schon Schichten existieren (dann ist es Alltag, keine
          Ersteinrichtung mehr), aber jederzeit auf einen Klick erreichbar,
          ohne die Seite zu verlassen. */}
      <div style={{ marginBottom: 24, border: '1px solid #e9ecef', borderRadius: 12, overflow: 'hidden' }}>
        <button
          onClick={() => setSetupExpandedOverride(!setupExpanded)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#f8f9fa', border: 'none', cursor: 'pointer', textAlign: 'left' }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: '#212557' }}>⚙️ Turnier-Einrichtung</span>
          <span style={{ fontSize: 13, color: '#6c757d' }}>Arbeitsbereiche, Turnier-Tage, Schichten generieren</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 18, color: '#6c757d', transition: 'transform 0.2s', display: 'inline-block', transform: setupExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>›</span>
        </button>

        {setupExpanded && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Arbeitsbereiche */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 16, color: '#212557' }}>🏪 Arbeitsbereiche dieses Turniers</h3>
                <span style={{ flex: 1 }} />
                <button style={{ ...btnStyle, background: '#198754', color: '#fff', minHeight: 38 }} onClick={sync}>Aus Katalog übernehmen</button>
              </div>
              {areas.length === 0 && <p style={{ color: '#888' }}>Noch keine Bereiche übernommen. Klicke „Aus Katalog übernehmen".</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                {areas.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '6px 0', borderBottom: '1px solid #f1f3f5', opacity: a.active ? 1 : 0.5 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 200 }}>
                      <input type="checkbox" checked={a.active} onChange={e => guard(async () => { await updateTournamentWorkArea(a.id, { active: e.target.checked }); queryClient.invalidateQueries({ queryKey: ['t-work-areas', tid] }); })} />
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
            <section>
              <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: '#212557' }}>📅 Turnier-Tage</h3>
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

            {/* Generieren */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: 16, color: '#212557' }}>🧩 Schichten generieren</h3>
                <span style={{ flex: 1 }} />
                <button style={{ ...btnStyle, background: '#ffc107', color: '#000', fontWeight: 'bold' }} onClick={() => setShowFeedbackModal(true)}>📊 Helfer-Feedback & Learnings</button>
                {jobSlots.length > 0 && (
                  <button style={{ ...btnStyle, background: '#f8d7da', color: '#842029' }} onClick={doClear}>Schichten löschen</button>
                )}
                <button style={{ ...btnStyle, background: '#0d6efd', color: '#fff' }} onClick={doGenerate}>Schichten generieren</button>
              </div>
              <p style={{ color: '#666', fontSize: 13, marginTop: 8, marginBottom: 0 }}>
                „Schichten generieren" ist jederzeit gefahrlos erneut klickbar: bereits erzeugte Schichten
                und Helferzuweisungen bleiben unangetastet, es werden nur die Kombinationen aus (neuem)
                Arbeitsbereich und Zeit-Slot ergänzt, die es noch nicht gibt. Feinschliff der Zeiten,
                Helfer einplanen und einzelne Schichten entfernen geschieht weiter unten in der
                Tages-Übersicht – oder direkt über „➕ Arbeitsbereich" bei jedem Tag.
              </p>
              {jobSlots.length === 0 && <p style={{ color: '#888' }}>Noch keine Schichten. Arbeitsbereiche + Tage oben einrichten und „Schichten generieren" klicken.</p>}
            </section>
          </div>
        )}
      </div>

      {jobSlots.length > 0 && (
        <>
          {/* Offene Punkte Widget */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
            {unbesetzteSlots.length > 0 ? (
              <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', padding: 16, borderRadius: 12 }}>
                <div style={{ fontSize: 18, marginBottom: 8 }}>⚠️ <strong style={{ color: '#856404' }}>{unbesetzteSlots.length} unbesetzte Job-Slots</strong></div>
                <p style={{ margin: 0, fontSize: 14, color: '#856404' }}>Es fehlen noch Helfer in verschiedenen Schichten.</p>
              </div>
            ) : (
              <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', padding: 16, borderRadius: 12 }}>
                <div style={{ fontSize: 18, marginBottom: 8 }}>✅ <strong style={{ color: '#155724' }}>Alle Job-Slots besetzt!</strong></div>
                <p style={{ margin: 0, fontSize: 14, color: '#155724' }}>Gute Arbeit!</p>
              </div>
            )}
          </div>

          {/* Editiermodus-Toolbar: Zeiten sind standardmäßig gesperrt (nur Helfer
              ein-/ausplanen ist ohne Umschalten möglich). Erst hier freigeschaltet
              lassen sich Balken ziehen; verlassen geht nur über Commit oder Verwerfen. */}
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
              const tournamentDay = days.find(d => new Date(d.date).toLocaleDateString('de-DE') === dateStr);
              slots.sort((a: any, b: any) => {
                const timeDiff = (a.startMin ?? a.daySlot?.startMin ?? 0) - (b.startMin ?? b.daySlot?.startMin ?? 0);
                if (timeDiff !== 0) return timeDiff;
                const orderA = a.workArea?.order ?? a.arbeitsbereich?.order ?? 9999;
                const orderB = b.workArea?.order ?? b.arbeitsbereich?.order ?? 9999;
                if (orderA !== orderB) return orderA - orderB;
                const nameA = a.workArea?.name || a.arbeitsbereich?.name || '';
                const nameB = b.workArea?.name || b.arbeitsbereich?.name || '';
                return nameA.localeCompare(nameB);
              });
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
                        {tournamentDay && (
                          <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderTop: '1px solid #e9ecef', flexWrap: 'wrap' }}>
                            <button style={{ ...btnStyle, background: '#e7f1ff', color: '#0d6efd', fontSize: 12, minHeight: 32, padding: '4px 10px' }} onClick={() => addWorkAreaToDay(tournamentDay)}>➕ Arbeitsbereich</button>
                            <button style={{ ...btnStyle, background: '#e2e3e5', color: '#383d41', fontSize: 12, minHeight: 32, padding: '4px 10px' }} onClick={() => doExportTemplate(tournamentDay)}>✨ Als Vorlage</button>
                          </div>
                        )}
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
                  headerRight={
                    tournamentDay && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          style={{ ...btnStyle, background: '#e7f1ff', color: '#0d6efd', padding: '4px 10px', fontSize: 12, minHeight: 28 }}
                          onClick={() => addWorkAreaToDay(tournamentDay)}
                          title="Einen weiteren, bereits aktiven Arbeitsbereich für diesen Tag einplanen"
                        >
                          ➕ Arbeitsbereich
                        </button>
                        <button
                          style={{ ...btnStyle, background: '#e2e3e5', color: '#383d41', padding: '4px 10px', fontSize: 12, minHeight: 28 }}
                          onClick={() => doExportTemplate(tournamentDay)}
                          title="Schichten dieses Tages als neue Tagesvorlage in den Katalog exportieren"
                        >
                          ✨ Als Vorlage
                        </button>
                      </div>
                    )
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
        </>
      )}

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

            <div style={{ padding: '16px 20px', borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <button
                onClick={async () => {
                  const assignedCount = volunteerShifts.filter(vs => vs.shiftId === selectedShift.id).length;
                  const areaName = (selectedShift as any).workArea?.name || (selectedShift as any).arbeitsbereich?.name || 'diese Schicht';
                  if (!(await modal.confirm({
                    title: 'Schicht entfernen',
                    message: assignedCount > 0
                      ? `"${areaName}" wirklich entfernen? ${assignedCount} zugewiesene Helfer werden automatisch ausgeplant und per Web-Push informiert.`
                      : `"${areaName}" wirklich entfernen? Nur diese eine Schicht wird gelöscht, der restliche Dienstplan bleibt unverändert.`,
                    variant: 'danger'
                  }))) return;
                  try {
                    await apiDelete(`/api/shifts/${selectedShift.id}`);
                    queryClient.invalidateQueries({ queryKey: ['shifts', selectedTournament] });
                    queryClient.invalidateQueries({ queryKey: ['volunteerShifts', selectedTournament] });
                    setSelectedShift(null);
                    await modal.alert({ title: 'Entfernt', message: 'Die Schicht wurde aus dem Dienstplan entfernt.' });
                  } catch (err: any) {
                    await modal.alert({ title: 'Fehler', message: err?.message || 'Schicht konnte nicht entfernt werden' });
                  }
                }}
                style={{ padding: '12px 16px', minHeight: 44, background: '#ffe3e3', color: '#dc3545', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold' }}
              >
                🗑️ Schicht entfernen
              </button>
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
