import fs from 'fs';
const replaceLiteral = (file, search, replace) => {
  let c = fs.readFileSync(file, 'utf8');
  c = c.split(search).join(replace);
  fs.writeFileSync(file, c);
};

const base = 'frontend/src/components/admin/stammdaten/';

replaceLiteral(base+'GlobalTimeSlots.tsx',
  \onClick={() => { apiPost('/api/global-time-slots', zsForm); queryClient.invalidateQueries({ queryKey: ['globalTimeSlots'] }); setZsForm({ name: '', startTime: '09:00', endTime: '10:00', color: '#3b98f8', order: 1 }); }}\, \onClick={saveGlobalTimeSlot}\);

replaceLiteral(base+'Helfer.tsx',
  \onClick={() => { apiPost('/api/volunteers', { ...volForm, role: 'HELPER' }); queryClient.invalidateQueries({ queryKey: ['volunteers'] }); setVolForm({ name: '', email: '', phone: '' }); }}\, \onClick={saveVolunteer}\);

replaceLiteral(base+'Vereine.tsx',
  \onClick={() => { apiPost('/api/clubs', clubForm); queryClient.invalidateQueries({ queryKey: ['clubs'] }); setClubForm({ name: '', city: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' }); }}\, \onClick={saveClub}\);

replaceLiteral(base+'WorkAreas.tsx',
  \onClick={() => { apiPost('/api/work-areas', abForm); queryClient.invalidateQueries({ queryKey: ['workAreas'] }); setAbForm({ name: '', icon: '👷', color: '#3b98f8', minVolunteers: 2, maxVolunteers: 8 }); }}\, \onClick={saveWorkArea}\);

replaceLiteral(base+'Lebensmittel.tsx',
  \onClick={() => { apiPost('/api/food/categories', foodCatForm); queryClient.invalidateQueries({ queryKey: ['foodCategories'] }); setFoodCatForm({ name: '', icon: '🥩', order: 0 }); }}\, \onClick={saveFoodCategory}\);

replaceLiteral(base+'Lebensmittel.tsx',
  \onClick={() => { apiPost('/api/food/items', foodItemForm); queryClient.invalidateQueries({ queryKey: ['foodItems'] }); setFoodItemForm({ categoryId: 0, name: '', price: '', unit: 'Stk' }); }}\, \onClick={saveFoodItem}\);

console.log('Fixed literally');
