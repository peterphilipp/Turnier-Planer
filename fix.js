const fs = require('fs');
const glob = require('glob');
const files = glob.sync('frontend/src/components/admin/stammdaten/*.tsx');
for(const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/onClick=\{[^}]+apiPost\('\/api\/work-areas'[^}]+\}\}/g, 'onClick={saveWorkArea}');
  c = c.replace(/onClick=\{[^}]+apiPost\('\/api\/clubs'[^}]+\}\}/g, 'onClick={saveClub}');
  c = c.replace(/onClick=\{[^}]+apiPost\('\/api\/global-time-slots'[^}]+\}\}/g, 'onClick={saveGlobalTimeSlot}');
  c = c.replace(/onClick=\{[^}]+apiPost\('\/api\/volunteers'[^}]+\}\}/g, 'onClick={saveVolunteer}');
  c = c.replace(/onClick=\{[^}]+apiPost\('\/api\/food\/categories'[^}]+\}\}/g, 'onClick={saveFoodCategory}');
  c = c.replace(/onClick=\{[^}]+apiPost\('\/api\/food\/items'[^}]+\}\}/g, 'onClick={saveFoodItem}');
  fs.writeFileSync(f, c);
}
console.log('Fixed');
