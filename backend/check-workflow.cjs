const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Workflow-Check:\n');
  
  // 1. Turniere
  const tournaments = await prisma.tournament.findMany({ include: { club: true, yearGroup: true } });
  console.log(`📋 Turniere: ${tournaments.length}`);
  tournaments.forEach(t => console.log(`   - ${t.name} (${new Date(t.startDate).toLocaleDateString('de-DE')}) [${t.status}]`));
  
  // 2. Jahrgänge
  const yearGroups = await prisma.yearGroup.findMany({ orderBy: { order: 'asc' } });
  console.log(`\n📅 Jahrgänge: ${yearGroups.length}`);
  yearGroups.forEach(yg => console.log(`   - ${yg.name} (${yg.birthYearStart}-${yg.birthYearEnd}) [${yg.isActive ? 'aktiv' : 'inaktiv'}]`));
  
  // 3. Arbeitsbereiche
  const areas = await prisma.arbeitsbereich.findMany();
  console.log(`\n🏢 Arbeitsbereiche: ${areas.length}`);
  areas.forEach(a => console.log(`   - ${a.name} (${a.icon})`));
  
  // 4. Zeitslots (global)
  const slots = await prisma.zeitSlot.findMany({ orderBy: { order: 'asc' } });
  console.log(`\n⏰ Globale Zeitslots: ${slots.length}`);
  slots.forEach(s => console.log(`   - ${s.name} (${s.startTime}-${s.endTime})`));
  
  // 5. TimeSlots (turnierspezifisch)
  const timeSlots = await prisma.timeSlot.findMany({ include: { tournament: true } });
  console.log(`\n📆 Turnier-Zeitblöcke: ${timeSlots.length}`);
  timeSlots.forEach(ts => console.log(`   - ${ts.tournament.name}: ${ts.label || ts.startTime}-${ts.endTime} (${new Date(ts.date).toLocaleDateString('de-DE')})`));
  
  // 6. Felder
  const fields = await prisma.field.findMany({ include: { tournament: true } });
  console.log(`\n🏟️ Spielfelder: ${fields.length}`);
  fields.forEach(f => console.log(`   - ${f.tournament.name}: ${f.name} [${f.status}]`));
  
  // 7. Gruppen
  const groups = await prisma.group.findMany({ include: { tournament: true } });
  console.log(`\n👥 Gruppen: ${groups.length}`);
  groups.forEach(g => console.log(`   - ${g.tournament.name}: ${g.name} (${g.teams?.length || 0} Teams)`));
  
  // 8. Teams
  const teams = await prisma.team.findMany({ include: { group: true } });
  console.log(`\n🏆 Teams: ${teams.length}`);
  teams.forEach(t => console.log(`   - ${t.name} [${t.group?.name || 'keine Gruppe'}]`));
  
  // 9. Matches
  const matches = await prisma.match.findMany({ include: { timeSlot: true, field: true } });
  console.log(`\n⚽ Matches: ${matches.length}`);
  if (matches.length > 0) {
    matches.slice(0, 5).forEach(m => console.log(`   - ${m.teamA?.name || '?'} vs ${m.teamB?.name || '?'}`));
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());
