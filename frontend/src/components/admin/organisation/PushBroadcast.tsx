import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVolunteers, getShifts, getVolunteerShifts, broadcastPush } from '../../../api';
import { Shift, VolunteerShift, minToTime, inputStyle, btnStyle } from '../shared';
import { modal } from '../Modal';

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

export default function PushBroadcast({ selectedTournament }: { selectedTournament: number | null }) {
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;
  const [mode, setMode] = useState<'all' | 'shifts' | 'users'>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [selectedShiftIds, setSelectedShiftIds] = useState<number[]>([]);
  const [title, setTitle] = useState('Wichtige Info zum Turnier');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [sending, setSending] = useState(false);

  const { data: volunteers = [], isLoading: loadingVolunteers } = useQuery<any[]>({
    queryKey: ['volunteers', selectedTournament],
    queryFn: () => getVolunteers(selectedTournament),
    enabled: !!selectedTournament && (mode === 'users' || mode === 'all')
  });

  const { data: shifts = [], isLoading: loadingShifts } = useQuery<Shift[]>({
    queryKey: ['shifts', selectedTournament],
    queryFn: () => getShifts(selectedTournament),
    enabled: !!selectedTournament && mode === 'shifts'
  });

  const { data: volunteerShifts = [] } = useQuery<VolunteerShift[]>({
    queryKey: ['volunteerShifts', selectedTournament],
    queryFn: () => getVolunteerShifts(selectedTournament),
    enabled: !!selectedTournament && mode === 'shifts'
  });

  // Sort shifts by date and startMin
  const sortedShifts = useMemo(() => {
    return [...shifts].sort((a: any, b: any) => {
      const dateA = a.day?.date || a.date;
      const dateB = b.day?.date || b.date;
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const startA = a.startMin ?? a.daySlot?.startMin ?? 0;
      const startB = b.startMin ?? b.daySlot?.startMin ?? 0;
      return startA - startB;
    });
  }, [shifts]);

  // Calculate estimated recipients for shifts mode
  const estimatedShiftRecipients = useMemo(() => {
    if (mode !== 'shifts' || selectedShiftIds.length === 0) return 0;
    const assignedUserIds = new Set(
      volunteerShifts
        .filter(vs => vs.shiftId && selectedShiftIds.includes(vs.shiftId))
        .map(vs => vs.userId)
    );
    return assignedUserIds.size;
  }, [mode, selectedShiftIds, volunteerShifts]);

  if (!selectedTournament) {
    return (
      <div style={{ padding: 48, textAlign: 'center', background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔔</div>
        <div style={{ fontSize: 20, fontWeight: '600', marginBottom: 8, color: '#212529' }}>Bitte ein Turnier auswählen</div>
        <div style={{ fontSize: 14, color: '#666' }}>Wähle oben ein Turnier aus, um Push-Nachrichten an Helfer zu senden</div>
      </div>
    );
  }

  const handleToggleUser = (id: number) => {
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleToggleShift = (id: number) => {
    setSelectedShiftIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      return await modal.alert({ title: 'Hinweis', message: 'Bitte Titel und Nachrichtentext ausfüllen.' });
    }
    if (mode === 'users' && selectedUserIds.length === 0) {
      return await modal.alert({ title: 'Hinweis', message: 'Bitte mindestens einen Helfer auswählen.' });
    }
    if (mode === 'shifts' && selectedShiftIds.length === 0) {
      return await modal.alert({ title: 'Hinweis', message: 'Bitte mindestens eine Schicht auswählen.' });
    }

    const recipientText = mode === 'all'
      ? 'alle Helfer dieses Turniers'
      : mode === 'shifts'
      ? `${estimatedShiftRecipients} Helfer aus ${selectedShiftIds.length} Schichten`
      : `${selectedUserIds.length} ausgewählte Helfer`;

    if (!(await modal.confirm({
      title: 'Push-Nachricht senden?',
      message: `Möchtest du diese Nachricht jetzt an ${recipientText} absenden?\n\nTitel: "${title}"\nText: "${body}"`
    }))) {
      return;
    }

    setSending(true);
    try {
      const res = await broadcastPush({
        mode,
        userIds: mode === 'users' ? selectedUserIds : undefined,
        shiftIds: mode === 'shifts' ? selectedShiftIds : undefined,
        tournamentId: selectedTournament,
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || '/'
      }) as any;

      await modal.alert({
        title: 'Erfolgreich gesendet 🎉',
        message: `Die Nachricht wurde an ${res.targetedUsers || 0} Helfer weitergeleitet.\n\nDavon wurden ${res.sentPushCount || 0} aktive PWA-Geräte direkt erreicht!`
      });
      setBody('');
    } catch (err: any) {
      await modal.alert({ title: 'Fehler', message: err?.message || 'Konnte Push-Nachricht nicht senden.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e9ecef' }}>
        <h2 style={{ margin: '0 0 6px 0', fontSize: 22, color: '#212529', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🔔</span> Helfer per PWA Push kontaktieren
        </h2>
        <p style={{ margin: '0 0 24px 0', color: '#6c757d', fontSize: 14 }}>
          Sende Sofort-Benachrichtigungen direkt auf die Geräte deiner Helfer. Keine E-Mails erforderlich!
        </p>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: 10, color: '#333' }}>1. Zielgruppe wählen:</label>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              { id: 'all', label: '📢 Alle Helfer im Turnier', desc: 'An alle registrierten Helfer' },
              { id: 'shifts', label: '🧩 Schichten auswählen', desc: 'An Helfer bestimmter Schichten' },
              { id: 'users', label: '👤 Einzelne Helfer', desc: 'Gezielt Personen auswählen' }
            ].map(item => (
              <div
                key={item.id}
                onClick={() => setMode(item.id as any)}
                style={{
                  padding: isMobile ? '16px 18px' : 14,
                  minHeight: isMobile ? 64 : undefined,
                  borderRadius: 12,
                  border: `2px solid ${mode === item.id ? '#0d6efd' : '#dee2e6'}`,
                  background: mode === item.id ? '#f0f7ff' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: isMobile ? 'row' : 'column',
                  alignItems: isMobile ? 'center' : undefined,
                  gap: isMobile ? 12 : 4
                }}
              >
                <div style={{ fontWeight: 'bold', color: mode === item.id ? '#0d6efd' : '#212529', fontSize: isMobile ? 16 : 14 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 12, color: '#6c757d' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bedingte Auswahl: Schichten */}
        {mode === 'shifts' && (
          <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 16, border: '1px solid #dee2e6', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <strong style={{ color: '#212529' }}>Schichten anhaken:</strong>
                <span style={{ marginLeft: 10, fontSize: 13, background: '#e9ecef', padding: '2px 8px', borderRadius: 10, color: '#495057', fontWeight: 600 }}>
                  Empfänger: ca. {estimatedShiftRecipients} Helfer ({selectedShiftIds.length} Schichten)
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setSelectedShiftIds(sortedShifts.map(s => s.id))}
                  style={{ padding: '4px 10px', fontSize: 12, background: '#fff', border: '1px solid #ced4da', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                >
                  Alle auswählen
                </button>
                <button
                  onClick={() => setSelectedShiftIds([])}
                  style={{ padding: '4px 10px', fontSize: 12, background: '#fff', border: '1px solid #ced4da', borderRadius: 6, cursor: 'pointer', color: '#dc3545' }}
                >
                  Auswahl aufheben
                </button>
              </div>
            </div>

            {loadingShifts ? (
              <div style={{ textAlign: 'center', padding: 20 }}>⏳ Lade Schichten...</div>
            ) : sortedShifts.length === 0 ? (
              <div style={{ color: '#6c757d', fontStyle: 'italic', padding: 10 }}>Keine Schichten in diesem Turnier vorhanden.</div>
            ) : (
              <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sortedShifts.map((s: any) => {
                  const shiftDate = s.day?.date || s.date;
                  const startMin = s.startMin ?? s.daySlot?.startMin ?? 0;
                  const endMin = s.endMin ?? s.daySlot?.endMin ?? 0;
                  const roleName = s.workArea?.name || s.arbeitsbereich?.name || 'Helfer';
                  const areaIcon = s.workArea?.icon || s.arbeitsbereich?.icon || '🔹';
                  const assignedCount = volunteerShifts.filter(vs => vs.shiftId === s.id).length;
                  const isChecked = selectedShiftIds.includes(s.id);

                  return (
                    <label
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMobile ? '12px 14px' : '8px 12px',
                        minHeight: isMobile ? 56 : undefined,
                        background: isChecked ? '#e7f1ff' : '#fff',
                        border: `1px solid ${isChecked ? '#b6d4fe' : '#dee2e6'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleShift(s.id)}
                          style={{ width: isMobile ? 22 : 16, height: isMobile ? 22 : 16, cursor: 'pointer' }}
                        />
                        <div>
                          <strong style={{ color: '#212529' }}>{areaIcon} {roleName}</strong>
                          <span style={{ color: '#6c757d', marginLeft: 8 }}>
                            📅 {new Date(shiftDate).toLocaleDateString('de-DE')} | ⏰ {minToTime(startMin)}-{minToTime(endMin)}
                          </span>
                        </div>
                      </div>
                      <span style={{ background: assignedCount > 0 ? '#d1e7dd' : '#f8d7da', color: assignedCount > 0 ? '#0f5132' : '#842029', padding: '2px 8px', borderRadius: 10, fontWeight: 600, fontSize: 11 }}>
                        {assignedCount} {assignedCount === 1 ? 'Helfer' : 'Helfer'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bedingte Auswahl: Einzelne Helfer */}
        {mode === 'users' && (
          <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 16, border: '1px solid #dee2e6', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <strong style={{ color: '#212529' }}>Helfer auswählen:</strong>
                <span style={{ marginLeft: 10, fontSize: 13, background: '#e9ecef', padding: '2px 8px', borderRadius: 10, color: '#495057', fontWeight: 600 }}>
                  Ausgewählt: {selectedUserIds.length} von {volunteers.length}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setSelectedUserIds(volunteers.map(v => v.id))}
                  style={{ padding: '4px 10px', fontSize: 12, background: '#fff', border: '1px solid #ced4da', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
                >
                  Alle auswählen
                </button>
                <button
                  onClick={() => setSelectedUserIds([])}
                  style={{ padding: '4px 10px', fontSize: 12, background: '#fff', border: '1px solid #ced4da', borderRadius: 6, cursor: 'pointer', color: '#dc3545' }}
                >
                  Auswahl aufheben
                </button>
              </div>
            </div>

            {loadingVolunteers ? (
              <div style={{ textAlign: 'center', padding: 20 }}>⏳ Lade Helfer...</div>
            ) : volunteers.length === 0 ? (
              <div style={{ color: '#6c757d', fontStyle: 'italic', padding: 10 }}>Keine Helfer gefunden.</div>
            ) : (
              <div style={{ maxHeight: 250, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {volunteers.map(v => {
                  const isChecked = selectedUserIds.includes(v.id);
                  return (
                    <label
                      key={v.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMobile ? '12px 14px' : '8px 12px',
                        minHeight: isMobile ? 56 : undefined,
                        background: isChecked ? '#e7f1ff' : '#fff',
                        border: `1px solid ${isChecked ? '#b6d4fe' : '#dee2e6'}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleUser(v.id)}
                          style={{ width: isMobile ? 22 : 16, height: isMobile ? 22 : 16, cursor: 'pointer' }}
                        />
                        <div>
                          <strong style={{ color: '#212529' }}>{v.name}</strong>
                          {v.email && <span style={{ color: '#6c757d', marginLeft: 6 }}>({v.email})</span>}
                        </div>
                      </div>
                      {v.role && <span style={{ fontSize: 11, background: '#e9ecef', padding: '2px 6px', borderRadius: 6, color: '#495057', fontWeight: 600 }}>{v.role}</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Nachrichten-Inhalt */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontWeight: '600', marginBottom: 10, color: '#333' }}>2. Nachricht verfassen:</label>
          
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', color: '#495057', marginBottom: 4 }}>Titel (Betreff):</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="z.B. Aufbau verschiebt sich um 30 Min"
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', color: '#495057', marginBottom: 4 }}>Nachrichtentext:</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Gib hier deine Nachricht an die Helfer ein..."
              rows={isMobile ? 6 : 4}
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', fontSize: isMobile ? 16 : 14 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 'bold', color: '#495057', marginBottom: 4 }}>Ziel-URL beim Klick (optional):</label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="/"
              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
            />
            <span style={{ fontSize: 11, color: '#6c757d', marginTop: 2, display: 'block' }}>Wohin soll der Helfer in der PWA geleitet werden, wenn er die Benachrichtigung anklickt?</span>
          </div>
        </div>

        {/* Absenden Button */}
        <div style={{ borderTop: '1px solid #e9ecef', paddingTop: 20, textAlign: isMobile ? 'center' : 'right' }}>
          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            style={{
              ...btnStyle,
              background: sending || !title.trim() || !body.trim() ? '#6c757d' : '#0d6efd',
              padding: isMobile ? '16px 24px' : '12px 24px',
              minHeight: 56,
              fontSize: isMobile ? 16 : 15,
              width: isMobile ? '100%' : undefined,
              cursor: sending || !title.trim() || !body.trim() ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <span>{sending ? '⏳' : '🚀'}</span>
            <span>{sending ? 'Versende Push-Nachrichten...' : 'Push-Nachricht jetzt absenden'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
