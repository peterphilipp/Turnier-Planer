import { useQuery } from '@tanstack/react-query';
import { getShifts, getVolunteerShifts } from '../../../api';
import { Shift, VolunteerShift, thStyle, tdStyle } from '../shared';

export default function Uebersicht({ selectedTournament }: { selectedTournament: number | null }) {
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

  if (jobSlots.length === 0) {
    return <div style={{ textAlign: 'center', padding: 40, color: '#666', background: '#fff', borderRadius: 16 }}>Bisher keine Job-Slots für dieses Turnier angelegt.</div>;
  }

  const grouped: Record<string, Shift[]> = {};
  jobSlots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(slot => {
    const dateKey = new Date(slot.date).toLocaleDateString('de-DE');
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(slot);
  });

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529', marginBottom: 24 }}>📊 Management Buchungen (Übersicht)</h3>
      
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
              <span style={{ float: 'right', fontSize: 14, color: '#666' }}>{slots.length} Schichten</span>
            </h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, borderTopLeftRadius: 12 }}>Zeitslot</th>
                    <th style={thStyle}>Bereich</th>
                    <th style={thStyle}>Belegt</th>
                    <th style={{ ...thStyle, borderTopRightRadius: 12 }}>Max. Helfer</th>
                  </tr>
                </thead>
                <tbody>
                  {slots.map(slot => (
                    <tr key={slot.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
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
                          const count = volunteerShifts.filter(vs => vs.shiftId === slot.id).length;
                          const status = count >= (slot.maxVolunteers || 0) ? 'full' : count > 0 ? 'partial' : 'empty';
                          const color = status === 'full' ? '#198754' : status === 'partial' ? '#ffc107' : '#dc3545';
                          const emoji = status === 'full' ? '🟢' : status === 'partial' ? '🟡' : '🔴';
                          return <span style={{ color, fontWeight: 'bold' }}>{emoji} {count}/{slot.maxVolunteers}</span>;
                        })()}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '600', color: '#666' }}>{slot.maxVolunteers}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
