import { useState, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shift, VolunteerShift, FoodDonationSlot, thStyle, tdStyle } from '../shared';
import { getShifts, getVolunteerShifts, getFoodDonationSlots } from '../../../api';

export default function Uebersicht({ selectedTournament }: { selectedTournament: number | null }) {
  // Hooks MÜSSEN vor allen early returns stehen
  const [expandedSlots, setExpandedSlots] = useState<Set<number>>(new Set());
  const toggleSlot = (slotId: number) => {
    setExpandedSlots(prev => {
      const next = new Set(prev);
      if (next.has(slotId)) next.delete(slotId);
      else next.add(slotId);
      return next;
    });
  };

  const { data: jobSlots = [], isFetching: busySlots } = useQuery<Shift[]>({
    queryKey: ['shifts', selectedTournament],
    queryFn: () => getShifts(selectedTournament),
    enabled: !!selectedTournament
  });

  const { data: volunteerShifts = [], isFetching: busyVolShifts } = useQuery<VolunteerShift[]>({
    queryKey: ['volunteerShifts', selectedTournament],
    queryFn: () => getVolunteerShifts(selectedTournament),
    enabled: !!selectedTournament
  });

  const { data: foodSlots = [], isFetching: busyFood } = useQuery<FoodDonationSlot[]>({
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

  const grouped: Record<string, Shift[]> = {};
  jobSlots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(slot => {
    const dateKey = new Date(slot.date).toLocaleDateString('de-DE');
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
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529', marginBottom: 24 }}>📊 Management Buchungen (Übersicht)</h3>
      
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

      {Object.entries(grouped).map(([dateStr, slots]) => {
        const firstSlot = slots[0];
        const firstDate = new Date(firstSlot.date);
        const dayName = firstDate.toLocaleDateString('de-DE', { weekday: 'long' });
        
        // Sort slots by time
        slots.sort((a, b) => (a.zeitslot?.order ?? 99) - (b.zeitslot?.order ?? 99));

        return (
          <div key={dateStr} style={{ marginBottom: 24 }}>
            <h4 style={{ background: '#f8f9fa', padding: '14px 18px', borderRadius: 10, marginTop: 0, fontSize: 16, fontWeight: '600', border: '1px solid #e9ecef' }}>
              📅 {dateStr} ({dayName})
              <span style={{ float: 'right', fontSize: 14, color: '#666' }}>{slots.length} Schichten · {slots.reduce((sum, s) => sum + volunteerShifts.filter(vs => vs.shiftId === s.id).length, 0)} Helfer</span>
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, borderTopLeftRadius: 12 }}>Zeitslot</th>
                    <th style={thStyle}>Bereich</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Belegt</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Max.</th>
                    <th style={{ ...thStyle, borderTopRightRadius: 12, textAlign: 'center' }}>Helfer</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map(slot => {
                    const assigned = volunteerShifts.filter(vs => vs.shiftId === slot.id);
                    const isExpanded = expandedSlots.has(slot.id);
                    return (
                      <Fragment key={`frag-${slot.id}`}>
                        <tr key={slot.id} style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }} onClick={() => toggleSlot(slot.id)}>
                          <td style={{ ...tdStyle, fontWeight: '600' }}>
                            {slot.zeitslot ? (
                              <span style={{ background: slot.zeitslot.color || '#3b98f8', color: '#fff', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: '600' }}>
                                {slot.zeitslot.name} ({slot.zeitslot.startTime} - {slot.zeitslot.endTime})
                              </span>
                            ) : <span style={{ color: '#adb5bd' }}>–</span>}
                          </td>
                          <td style={tdStyle}>
                            {slot.arbeitsbereich ? (
                              <span style={{ background: slot.arbeitsbereich.color || '#6c757d', color: '#fff', padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: '600' }}>
                                {slot.arbeitsbereich.icon} {slot.arbeitsbereich.name}
                              </span>
                            ) : '–'}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600' }}>
                            {(() => {
                              const count = assigned.length;
                              const status = count >= (slot.maxVolunteers || 0) ? 'full' : count > 0 ? 'partial' : 'empty';
                              const color = status === 'full' ? '#198754' : status === 'partial' ? '#ffc107' : '#dc3545';
                              const emoji = status === 'full' ? '🟢' : status === 'partial' ? '🟡' : '🔴';
                              return <span style={{ color, fontWeight: 'bold' }}>{emoji} {count}/{slot.maxVolunteers}</span>;
                            })()}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600', color: '#666' }}>{slot.maxVolunteers}</td>
                          <td style={{ ...tdStyle, textAlign: 'center', fontSize: 18 }}>
                            {assigned.length > 0 ? (isExpanded ? '▼' : '▶') : '–'}
                          </td>
                        </tr>
                        {/* Aufgeklappte Helfer */}
                        {isExpanded && (
                          <tr key={`${slot.id}-detail`} style={{ background: '#f8f9fa' }}>
                            <td colSpan={4} style={{ padding: 0 }}>
                              <div style={{ padding: '12px 16px' }}>
                                <div style={{ fontSize: 13, fontWeight: 'bold', color: '#495057', marginBottom: 8 }}>
                                  📋 Zugewiesene Helfer ({assigned.length})
                                </div>
                                {assigned.length === 0 ? (
                                  <div style={{ color: '#adb5bd', fontSize: 13, fontStyle: 'italic' }}>Keine Helfer zugewiesen</div>
                                ) : (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {assigned.map(vs => (
                                      <div key={vs.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #dee2e6', borderRadius: 8, padding: '6px 10px', minWidth: 180 }}>
                                        <span style={{ background: '#e7f3ff', color: '#0d6efd', padding: '2px 10px', borderRadius: 6, fontSize: 13, fontWeight: 'bold' }}>
                                          {vs.user?.name || '?'}
                                        </span>
                                        <span style={{ color: '#6c757d', fontSize: 12 }}>{vs.user?.phone ? vs.user.phone.replace(/(.{3}).*({.*})/, '$1…$2') : ''}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
