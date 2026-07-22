const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const areas = [
  { name: 'Verkaufsstand', icon: '🏪', minVolunteers: 3, maxVolunteers: 8, color: '#3b98f8' },
  { name: 'Küche', icon: '🍳', minVolunteers: 3, maxVolunteers: 10, color: '#e74c3c' },
  { name: 'Grillstand', icon: '🔥', minVolunteers: 3, maxVolunteers: 8, color: '#e67e22' },
  { name: 'Pfandrückgabe', icon: '🥤', minVolunteers: 2, maxVolunteers: 6, color: '#27ae60' },
  { name: 'Hüpfburg', icon: '🏰', minVolunteers: 2, maxVolunteers: 6, color: '#8e44ad' },
  { name: 'Torschussradar', icon: '🎯', minVolunteers: 2, maxVolunteers: 6, color: '#f39c12' },
  { name: 'Fußballdart', icon: '⚽', minVolunteers: 2, maxVolunteers: 6, color: '#1abc9c' },
  { name: 'Essen/Tee/Kuchen/Muffins', icon: '🍰', minVolunteers: 3, maxVolunteers: 8, color: '#2c3e50' }
];

(async () => {
  for (const a of areas) {
    await prisma.arbeitsbereich.create({ data: a });
  }
  console.log('Seeded', areas.length, 'areas');
  await prisma.$disconnect();
})();
