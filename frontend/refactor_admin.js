import fs from 'fs';

const path = 'src/components/AdminView.tsx';
let content = fs.readFileSync(path, 'utf8');

const replacements = [
  // saveSlot
  [
    `await fetch(\`/api/shifts/\${editingSlotId}\`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, zeitslotId: slotForm.zeitslotId, arbeitsbereichId: slotForm.arbeitsbereichIds[0], maxVolunteers: arbeitsbereiche.find(a => a.id === slotForm.arbeitsbereichIds[0])?.maxVolunteers || 8, description: slotForm.description || null, slot: slotName }) });`,
    `await apiPatch(\`/api/shifts/\${editingSlotId}\`, { date, zeitslotId: slotForm.zeitslotId, arbeitsbereichId: slotForm.arbeitsbereichIds[0], maxVolunteers: arbeitsbereiche.find(a => a.id === slotForm.arbeitsbereichIds[0])?.maxVolunteers || 8, description: slotForm.description || null, slot: slotName });`
  ],
  [
    `await fetch('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tournamentId: selectedTournament, date, zeitslotId: slotForm.zeitslotId, arbeitsbereichId: abId, maxVolunteers: maxVol, description: slotForm.description || null, slot: slotName }) });`,
    `await apiPost('/api/shifts', { tournamentId: selectedTournament, date, zeitslotId: slotForm.zeitslotId, arbeitsbereichId: abId, maxVolunteers: maxVol, description: slotForm.description || null, slot: slotName });`
  ],
  [
    `setJobSlots(await (await fetch('/api/shifts?tournamentId=' + selectedTournament)).json());`,
    `queryClient.invalidateQueries({ queryKey: ['shifts', selectedTournament] });`
  ],
  // deleteSlot
  [
    `await fetch(\`/api/shifts/\${id}\`, { method: 'DELETE' }); setJobSlots(await (await fetch('/api/shifts?tournamentId=' + selectedTournament)).json());`,
    `await apiDelete(\`/api/shifts/\${id}\`); queryClient.invalidateQueries({ queryKey: ['shifts', selectedTournament] });`
  ],
  // updateTournamentStatus
  [
    `await fetch(\`/api/tournaments/\${statusDialog.tournament.id}/status\`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); setTournaments(await (await fetch('/api/tournaments')).json());`,
    `await apiPatch(\`/api/tournaments/\${statusDialog.tournament.id}/status\`, { status }); queryClient.invalidateQueries({ queryKey: ['tournaments'] });`
  ],
  // saveTournamentEdit
  [
    `await fetch(\`/api/tournaments/\${statusDialog.tournament.id}\`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: statusDialog.editName,
        startDate: statusDialog.editStart,
        endDate: statusDialog.editEnd,
        clubId: statusDialog.editClubId ? parseInt(statusDialog.editClubId) : null,
      }),
    });`,
    `await apiPatch(\`/api/tournaments/\${statusDialog.tournament.id}\`, {
        name: statusDialog.editName,
        startDate: statusDialog.editStart,
        endDate: statusDialog.editEnd,
        clubId: statusDialog.editClubId ? parseInt(statusDialog.editClubId) : null,
      });`
  ],
  [
    `setTournaments(await (await fetch('/api/tournaments')).json());`,
    `queryClient.invalidateQueries({ queryKey: ['tournaments'] });`
  ],
  // saveArbeitsbereich
  [
    `await fetch(\`/api/arbeitsbereiche/\${editingAb}\`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(abForm) });`,
    `await apiPatch(\`/api/arbeitsbereiche/\${editingAb}\`, abForm);`
  ],
  [
    `await fetch('/api/arbeitsbereiche', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(abForm) });`,
    `await apiPost('/api/arbeitsbereiche', abForm);`
  ],
  [
    `setArbeitsbereiche(await (await fetch('/api/arbeitsbereiche')).json());`,
    `queryClient.invalidateQueries({ queryKey: ['arbeitsbereiche'] });`
  ],
  // deleteArbeitsbereich
  [
    `await fetch(\`/api/arbeitsbereiche/\${id}\`, { method: 'DELETE' }); setArbeitsbereiche(await (await fetch('/api/arbeitsbereiche')).json());`,
    `await apiDelete(\`/api/arbeitsbereiche/\${id}\`); queryClient.invalidateQueries({ queryKey: ['arbeitsbereiche'] });`
  ],
  // saveZeitslot
  [
    `await fetch(\`/api/zeit-slots/\${editingZs}\`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(zsForm) });`,
    `await apiPatch(\`/api/zeit-slots/\${editingZs}\`, zsForm);`
  ],
  [
    `await fetch('/api/zeit-slots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(zsForm) });`,
    `await apiPost('/api/zeit-slots', zsForm);`
  ],
  [
    `setZeitSlots(await (await fetch('/api/zeit-slots')).json());`,
    `queryClient.invalidateQueries({ queryKey: ['zeitSlots'] });`
  ],
  // deleteZeitslot
  [
    `await fetch(\`/api/zeit-slots/\${id}\`, { method: 'DELETE' }); setZeitSlots(await (await fetch('/api/zeit-slots')).json());`,
    `await apiDelete(\`/api/zeit-slots/\${id}\`); queryClient.invalidateQueries({ queryKey: ['zeitSlots'] });`
  ],
  // saveVolunteer
  [
    `await fetch(\`/api/volunteers/\${editingVol}\`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...volForm, roles: ['Helfer'] }) });`,
    `await apiPatch(\`/api/volunteers/\${editingVol}\`, { ...volForm, roles: ['Helfer'] });`
  ],
  [
    `await fetch('/api/volunteers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...volForm, roles: ['Helfer'] }) });`,
    `await apiPost('/api/volunteers', { ...volForm, roles: ['Helfer'] });`
  ],
  [
    `setVolunteers(await (await fetch('/api/volunteers')).json());`,
    `queryClient.invalidateQueries({ queryKey: ['volunteers'] });`
  ],
  // deleteVolunteer
  [
    `await fetch(\`/api/volunteers/\${id}\`, { method: 'DELETE' });\n    setVolunteers(await (await fetch('/api/volunteers')).json());`,
    `await apiDelete(\`/api/volunteers/\${id}\`);\n    queryClient.invalidateQueries({ queryKey: ['volunteers'] });`
  ],
  // saveClub
  [
    `await fetch(\`/api/clubs/\${editingClub}\`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });`,
    `await apiPut(\`/api/clubs/\${editingClub}\`, data);`
  ],
  [
    `await fetch('/api/clubs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });`,
    `await apiPost('/api/clubs', data);`
  ],
  [
    `setClubs(await (await fetch('/api/clubs')).json());`,
    `queryClient.invalidateQueries({ queryKey: ['clubs'] });`
  ],
  // deleteClub
  [
    `await fetch(\`/api/clubs/\${id}\`, { method: 'DELETE' });\n    setClubs(await (await fetch('/api/clubs')).json());`,
    `await apiDelete(\`/api/clubs/\${id}\`);\n    queryClient.invalidateQueries({ queryKey: ['clubs'] });`
  ],
  // Add Tournament
  [
    `await fetch('/api/tournaments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, startDate: start, endDate: end, status: 'aktiv', clubId: clubId ? parseInt(clubId) : null }) });`,
    `await apiPost('/api/tournaments', { name, startDate: start, endDate: end, status: 'aktiv', clubId: clubId ? parseInt(clubId) : null });`
  ],
  // change Password
  [
    `await fetch(\`/api/volunteers/\${v.id}/password\`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });`,
    `await apiPatch(\`/api/volunteers/\${v.id}/password\`, { password: pw });`
  ]
];

for (const [search, replace] of replacements) {
  content = content.replace(search, replace);
}

fs.writeFileSync(path, content);
console.log('Done refactoring AdminView mutations.');
