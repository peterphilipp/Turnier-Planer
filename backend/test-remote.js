fetch('https://turnier-planer-admin.mygate.dedyn.io/api/shifts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tournamentId: 1,
    date: '2026-07-24',
    zeitslotId: 1,
    arbeitsbereichId: 1,
    maxVolunteers: 8,
    description: null,
    slot: 'Test'
  })
}).then(r => r.json()).then(console.log).catch(console.error);
