import fs from 'fs';

const fixes = [
  { file: 'GlobalTimeSlots.tsx', fn: 'saveGlobalTimeSlot', btn: 'Hinzuf' },
  { file: 'Helfer.tsx', fn: 'saveVolunteer', btn: 'Hinzuf' },
  { file: 'Vereine.tsx', fn: 'saveClub', btn: 'Hinzuf' },
  { file: 'WorkAreas.tsx', fn: 'saveWorkArea', btn: 'Hinzuf' }
];

for (const fix of fixes) {
  const path = 'frontend/src/components/admin/stammdaten/' + fix.file;
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/onClick=\{[^<]+<\/?span>[^<]*Hinzuf/g, 'onClick={' + fix.fn + '}><span');
  fs.writeFileSync(path, content);
}
console.log('Done');
